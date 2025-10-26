export default function SorteoDetailLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 bg-[color:var(--muted)] rounded animate-pulse" />
          <div className="h-4 w-16 bg-[color:var(--muted)] rounded animate-pulse" />
          <div className="h-4 w-32 bg-[color:var(--muted)] rounded animate-pulse" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Raffle Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Image Skeleton */}
            <div className="aspect-video bg-[color:var(--muted)] rounded-2xl animate-pulse" />

            {/* Title & Description Skeleton */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-8 w-3/4 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-[color:var(--muted)] rounded-full animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <div className="h-4 w-full bg-[color:var(--muted)] rounded animate-pulse" />
                <div className="h-4 w-full bg-[color:var(--muted)] rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-[color:var(--muted)] rounded animate-pulse" />
              </div>

              {/* Prize Skeleton */}
              <div className="pt-4 border-t border-[color:var(--border)] space-y-3">
                <div className="h-6 w-32 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                <div className="h-4 w-full bg-[color:var(--muted)] rounded animate-pulse" />
              </div>
            </div>

            {/* Progress Skeleton */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4">
              <div className="h-5 w-48 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                <div className="h-20 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            <div className="bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-6 space-y-6 sticky top-6">
              {/* Mode Skeleton */}
              <div className="text-center space-y-2 pb-6 border-b border-[color:var(--border)]">
                <div className="h-4 w-32 bg-[color:var(--muted)] rounded mx-auto animate-pulse" />
                <div className="h-8 w-40 bg-[color:var(--muted)] rounded-lg mx-auto animate-pulse" />
              </div>

              {/* Button Skeleton */}
              <div className="space-y-3">
                <div className="h-12 w-full bg-[color:var(--muted)] rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-[color:var(--muted)] rounded-xl animate-pulse" />
              </div>

              {/* Info Skeleton */}
              <div className="space-y-3 pt-6 border-t border-[color:var(--border)]">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-[color:var(--muted)] rounded animate-pulse" />
                    <div className="h-4 w-32 bg-[color:var(--muted)] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
