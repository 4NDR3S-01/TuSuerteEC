export default function PlanesLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <div className="text-center space-y-4">
          <div className="h-12 w-64 bg-[color:var(--muted)] rounded-lg mx-auto animate-pulse" />
          <div className="h-6 w-96 bg-[color:var(--muted)] rounded-lg mx-auto animate-pulse" />
        </div>

        {/* Plans Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-8 space-y-6"
            >
              {/* Plan Name */}
              <div className="h-8 w-32 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              
              {/* Price */}
              <div className="space-y-2">
                <div className="h-12 w-40 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                <div className="h-4 w-24 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              </div>

              {/* Features */}
              <div className="space-y-3 pt-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-[color:var(--muted)] rounded-full animate-pulse" />
                    <div className="h-4 flex-1 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Button */}
              <div className="h-12 w-full bg-[color:var(--muted)] rounded-xl animate-pulse mt-6" />
            </div>
          ))}
        </div>

        {/* FAQ Section Skeleton */}
        <div className="mt-16 space-y-4">
          <div className="h-8 w-48 bg-[color:var(--muted)] rounded-lg mx-auto animate-pulse" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
