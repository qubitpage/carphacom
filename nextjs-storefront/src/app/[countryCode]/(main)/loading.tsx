export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-dark-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-dark-700 border-t-primary-500 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg" />
          </div>
        </div>
        <p className="text-dark-400 text-sm">Se încarcă...</p>
      </div>
    </div>
  )
}
