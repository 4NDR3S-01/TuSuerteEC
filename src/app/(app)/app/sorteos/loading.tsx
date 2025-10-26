export default function SorteosLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-[color:var(--muted)] animate-pulse rounded-lg w-64" />
          <div className="h-4 bg-[color:var(--muted)] animate-pulse rounded-lg w-96" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border border-[color:var(--border)] rounded-xl">
              <div className="h-4 bg-[color:var(--muted)] animate-pulse rounded w-24 mb-2" />
              <div className="h-8 bg-[color:var(--muted)] animate-pulse rounded w-16" />
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-[color:var(--muted)] animate-pulse rounded-xl" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 w-24 bg-[color:var(--muted)] animate-pulse rounded-lg" />
            ))}
          </div>
        </div>

        {/* Raffles Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-2 border-[color:var(--border)] rounded-2xl overflow-hidden">
              <div className="aspect-video bg-[color:var(--muted)] animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-[color:var(--muted)] animate-pulse rounded w-full" />
                <div className="h-4 bg-[color:var(--muted)] animate-pulse rounded w-3/4" />
                <div className="h-4 bg-[color:var(--muted)] animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
