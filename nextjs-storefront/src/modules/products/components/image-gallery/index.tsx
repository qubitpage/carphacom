"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useState } from "react"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ImageGalleryProps = {
  images?: HttpTypes.StoreProductImage[] | null
  thumbnail?: string | null
}

const ImageGallery = ({ images, thumbnail }: ImageGalleryProps) => {
  const imageList = images?.length ? images : (thumbnail ? [{ id: "thumb", url: thumbnail }] : [])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hasError, setHasError] = useState<Record<string, boolean>>({})

  if (!imageList.length) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="relative aspect-square w-full max-w-[500px] overflow-hidden bg-white border-2 border-dark-600 rounded-2xl flex items-center justify-center">
          <PlaceholderImage size={64} />
        </div>
      </div>
    )
  }

  const selectedImage = imageList[selectedIndex]

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full max-w-[500px] mx-auto overflow-hidden bg-white border-2 border-dark-600 rounded-2xl shadow-xl group">
        {selectedImage?.url && !hasError[selectedImage.id || ''] ? (
          <>
            <Image
              src={selectedImage.url}
              className="absolute inset-0 p-4 transition-transform duration-300 group-hover:scale-105"
              alt={`Product image ${selectedIndex + 1}`}
              fill
              sizes="(max-width: 576px) 100vw, (max-width: 768px) 80vw, 500px"
              style={{ objectFit: "contain" }}
              onError={() => setHasError(prev => ({ ...prev, [selectedImage.id || '']: true }))}
            />
            {/* Zoom hint */}
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              🔍 Hover pentru zoom
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlaceholderImage size={64} />
          </div>
        )}
        
        {/* Navigation arrows */}
        {imageList.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex(prev => prev === 0 ? imageList.length - 1 : prev - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedIndex(prev => prev === imageList.length - 1 ? 0 : prev + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Image counter */}
        {imageList.length > 1 && (
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
            {selectedIndex + 1} / {imageList.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex justify-center gap-2 flex-wrap max-w-[500px] mx-auto">
          {imageList.map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => setSelectedIndex(index)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-lg border-2 transition-all ${
                selectedIndex === index
                  ? 'border-primary-500 ring-2 ring-primary-500/30 scale-105'
                  : 'border-dark-600 hover:border-dark-400'
              }`}
            >
              {image.url && !hasError[image.id || ''] ? (
                <Image
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="p-1 bg-white"
                  sizes="80px"
                  style={{ objectFit: "contain" }}
                  onError={() => setHasError(prev => ({ ...prev, [image.id || '']: true }))}
                />
              ) : (
                <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                  <PlaceholderImage size={24} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
