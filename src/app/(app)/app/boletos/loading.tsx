export default function BoletosLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-10 w-48 bg-[color:var(--muted)] rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-[color:var(--muted)] rounded-lg animate-pulse" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6 space-y-3"
            >
              <div className="h-10 w-10 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              <div className="h-8 w-20 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-[color:var(--muted)] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-10 bg-[color:var(--muted)] rounded-lg animate-pulse" />
            <div className="h-10 bg-[color:var(--muted)] rounded-lg animate-pulse" />
            <div className="h-10 bg-[color:var(--muted)] rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Tickets List Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                {/* Image */}
                <div className="h-24 w-24 bg-[color:var(--muted)] rounded-lg animate-pulse flex-shrink-0" />
                
                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-3/4 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                  <div className="h-4 w-1/2 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="h-8 w-24 bg-[color:var(--muted)] rounded-full animate-pulse" />
                    <div className="h-8 w-32 bg-[color:var(--muted)] rounded-full animate-pulse" />
                    <div className="h-8 w-28 bg-[color:var(--muted)] rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
