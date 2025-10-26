export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-10 w-64 bg-[color:var(--muted)] rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-[color:var(--muted)] rounded-lg animate-pulse" />
        </div>

        {/* Tabs Skeleton */}
        <div className="flex items-center gap-2 border-b border-[color:var(--border)] pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-32 bg-[color:var(--muted)] rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Settings Cards Skeleton */}
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6 space-y-6">
            <div className="h-6 w-48 bg-[color:var(--muted)] rounded-lg animate-pulse" />
            
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 bg-[color:var(--muted)] rounded-full animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                <div className="h-4 w-48 bg-[color:var(--muted)] rounded-lg animate-pulse" />
              </div>
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                  <div className="h-10 w-full bg-[color:var(--muted)] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>

            <div className="h-10 w-32 bg-[color:var(--muted)] rounded-lg animate-pulse" />
          </div>

          {/* Security Section */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6 space-y-6">
            <div className="h-6 w-40 bg-[color:var(--muted)] rounded-lg animate-pulse" />
            
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[color:var(--muted)]/30 rounded-lg">
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                  </div>
                  <div className="h-9 w-24 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6 space-y-6">
            <div className="h-6 w-48 bg-[color:var(--muted)] rounded-lg animate-pulse" />
            
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                    <div className="h-4 w-72 bg-[color:var(--muted)] rounded-lg animate-pulse" />
                  </div>
                  <div className="h-6 w-12 bg-[color:var(--muted)] rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
