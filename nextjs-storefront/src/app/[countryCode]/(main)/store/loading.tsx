export default function StoreLoading() {
  return (
    <div className="flex flex-col small:flex-row small:items-start py-6 content-container animate-pulse">
      {/* Sidebar skeleton */}
      <div className="hidden small:block w-[250px] flex-shrink-0 pr-4">
        <div className="space-y-4">
          <div className="h-6 bg-dark-700 rounded w-32" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-dark-700 rounded w-full" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Products grid skeleton */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-dark-700 rounded w-48" />
          <div className="h-10 bg-dark-700 rounded w-32" />
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-dark-800 rounded-xl overflow-hidden">
              <div className="aspect-square bg-dark-700" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-dark-700 rounded w-full" />
                <div className="h-4 bg-dark-700 rounded w-3/4" />
                <div className="h-5 bg-dark-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
