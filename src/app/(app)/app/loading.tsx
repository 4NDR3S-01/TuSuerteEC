export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-[color:var(--muted-foreground)]">
      <span className="animate-pulse text-sm font-medium">Cargando dashboard…</span>
    </div>
  );
}
