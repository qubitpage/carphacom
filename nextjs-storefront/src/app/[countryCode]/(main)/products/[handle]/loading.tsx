export default function ProductLoading() {
  return (
    <div className="content-container py-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-6">
        <div className="h-4 bg-dark-700 rounded w-16" />
        <div className="h-4 bg-dark-700 rounded w-24" />
        <div className="h-4 bg-dark-700 rounded w-32" />
      </div>
      
      <div className="flex flex-col medium:flex-row gap-8">
        {/* Image gallery skeleton */}
        <div className="w-full medium:w-1/2">
          <div className="aspect-square bg-dark-700 rounded-xl" />
          <div className="flex gap-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-20 h-20 bg-dark-700 rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Product info skeleton */}
        <div className="w-full medium:w-1/2 space-y-6">
          <div className="h-8 bg-dark-700 rounded w-3/4" />
          <div className="h-6 bg-dark-700 rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-4 bg-dark-700 rounded w-full" />
            <div className="h-4 bg-dark-700 rounded w-full" />
            <div className="h-4 bg-dark-700 rounded w-2/3" />
          </div>
          <div className="h-12 bg-primary-500/20 rounded-lg w-full" />
          <div className="h-12 bg-dark-700 rounded-lg w-full" />
        </div>
      </div>
    </div>
  )
}
