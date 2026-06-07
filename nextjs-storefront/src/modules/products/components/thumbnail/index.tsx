"use client"

import { Container, clx } from "@medusajs/ui"
import Image from "next/image"
import React, { useState } from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: any[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  alt?: string
  priority?: boolean // Add priority for above-the-fold images
  imageFit?: "cover" | "contain"
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  alt,
  priority = false,
  imageFit = "contain",
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden bg-dark-700 border-2 border-dark-600 shadow-md rounded-lg group-hover:border-primary-500/50 group-hover:shadow-primary-500/20 transition-[border-color,box-shadow] ease-in-out duration-150",
        className,
        {
          "aspect-square": true,
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} priority={priority} alt={alt} imageFit={imageFit} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
  priority = false,
  alt,
  imageFit = "contain",
}: Pick<ThumbnailProps, "size" | "priority" | "alt" | "imageFit"> & { image?: string }) => {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
    return (
      <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-dark-600">
        <PlaceholderImage size={size === "small" ? 16 : 24} />
      </div>
    )
  }

  return (
    <Image
      src={image}
      alt={alt || "Produs"}
      className={`absolute inset-0 w-full h-full ${imageFit === "cover" ? "object-cover p-0" : "object-contain p-2"}`}
      draggable={false}
      quality={75}
      sizes="(max-width: 576px) 44vw, (max-width: 768px) 30vw, (max-width: 992px) 22vw, 280px"
      fill
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      onError={() => setHasError(true)}
    />
  )
}

export default Thumbnail
