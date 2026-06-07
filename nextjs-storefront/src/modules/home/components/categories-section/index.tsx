import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

// Category data with real product images from PNI CDN
const CATEGORIES = [
  {
    name: "Stații CB",
    slug: "statii-radio-statii-cb",
    image: "https://cdn.mypni.com/products/37595_smsn.jpg",
    color: "from-primary-500/20 to-primary-600/10",
    borderColor: "border-primary-500/30",
    textColor: "text-primary-400"
  },
  {
    name: "Antene CB",
    slug: "statii-radio-antene-cb",
    image: "https://cdn.mypni.com/products/63284_smsn.jpg",
    color: "from-accent-500/20 to-accent-600/10",
    borderColor: "border-accent-500/30",
    textColor: "text-accent-400"
  },
  {
    name: "Walkie Talkie",
    slug: "statii-radio-statii-pmr",
    image: "https://cdn.mypni.com/products/36743_smsn.jpg",
    color: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400"
  },
  {
    name: "Accesorii",
    slug: "statii-radio-accesorii-statii-radio",
    image: "https://cdn.mypni.com/products/35002_smsn.jpg",
    color: "from-yellow-500/20 to-yellow-600/10",
    borderColor: "border-yellow-500/30",
    textColor: "text-yellow-400"
  },
  {
    name: "Electronice Auto",
    slug: "electronice-auto",
    image: "https://cdn.mypni.com/products/65576_smsn.jpg",
    color: "from-orange-500/20 to-orange-600/10",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400"
  },
  {
    name: "VHF/UHF",
    slug: "statii-radio-statii-uhfvhf",
    image: "https://cdn.mypni.com/products/64266_smsn.jpg",
    color: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400"
  }
]

const CategoriesSection = () => {
  return (
    <section className="py-8 bg-dark-900">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-accent-500 rounded-full"></span>
            <h2 className="text-xl font-bold text-white">Categorii Produse</h2>
          </div>
          <LocalizedClientLink 
            href="/categories"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1 min-h-[44px]"
          >
            Toate categoriile
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </LocalizedClientLink>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-6 gap-3">
          {CATEGORIES.map((category, idx) => (
            <LocalizedClientLink
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group"
            >
              <div className={`bg-gradient-to-br ${category.color} border border-dark-700 rounded-xl overflow-hidden hover:border-primary-500/50 transition-colors duration-300`}>
                {/* Product Image */}
                <div className="aspect-square relative overflow-hidden bg-dark-800">
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={300}
                    height={300}
                    className="w-full h-full object-contain p-2"
                    {...(idx < 2 ? { priority: true } : { loading: "lazy" })}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 15vw, 150px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent" />
                </div>
                {/* Label */}
                <div className="p-3 text-center">
                  <span className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">
                    {category.name}
                  </span>
                </div>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategoriesSection
