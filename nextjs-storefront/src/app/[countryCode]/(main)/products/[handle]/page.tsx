import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { getStorefrontPriceVisibility } from "@lib/data/price-visibility"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

// Revalidate product pages every 60 seconds (ISR)
export const revalidate = 60

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!product?.images) {
    return []
  }
  
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return product.images.filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Banat Tractor`,
    description: product.description
      ? product.description.replace(/<[^>]*>/g, '').slice(0, 160)
      : `${product.title} disponibil prin Banat Tractor. Cere ofertă personalizată pentru configurație, livrare și consultanță tehnică.`,
    alternates: {
      canonical: `https://banat-tractor.ro/ro/products/${handle}`,
      languages: {
        "ro": `https://banat-tractor.ro/ro/products/${handle}`,
        "x-default": `https://banat-tractor.ro/ro/products/${handle}`,
      },
    },
    openGraph: {
      title: `${product.title} | Banat Tractor`,
      description: product.description
        ? product.description.replace(/<[^>]*>/g, '').slice(0, 160)
        : `Cere ofertă pentru ${product.title}.`,
      images: product.thumbnail ? [product.thumbnail] : [],
      url: `https://banat-tractor.ro/ro/products/${handle}`,
      type: 'website',
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId) || []
  const showPrices = await getStorefrontPriceVisibility()

  // Build JSON-LD Product structured data for rich results
  const cheapestVariant = pricedProduct.variants
    ?.filter((v) => v.calculated_price?.calculated_amount != null)
    .sort(
      (a, b) =>
        (a.calculated_price?.calculated_amount ?? Infinity) -
        (b.calculated_price?.calculated_amount ?? Infinity)
    )[0]

  const priceAmount = cheapestVariant?.calculated_price?.calculated_amount
  const priceCurrency =
    cheapestVariant?.calculated_price?.currency_code?.toUpperCase() || "RON"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pricedProduct.title,
    description: pricedProduct.description
      ? pricedProduct.description.replace(/<[^>]*>/g, "").slice(0, 5000)
      : undefined,
    image: pricedProduct.images?.map((i) => i.url) || [],
    url: `https://banat-tractor.ro/ro/products/${pricedProduct.handle}`,
    sku: cheapestVariant?.sku || undefined,
    brand: pricedProduct.metadata?.manufacturer
      ? {
          "@type": "Brand",
          name: pricedProduct.metadata.manufacturer as string,
        }
      : undefined,
    ...(showPrices && priceAmount != null
      ? {
          offers: {
            "@type": "Offer",
            url: `https://banat-tractor.ro/ro/products/${pricedProduct.handle}`,
            priceCurrency,
            price: (priceAmount / 100).toFixed(2),
            availability:
              pricedProduct.variants?.some(
                (v) =>
                  v.inventory_quantity == null || v.inventory_quantity > 0
              )
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: {
              "@type": "Organization",
              name: "Banat Tractor",
            },
          },
        }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images}
      />
    </>
  )
}
