export default function DashboardHomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Este será el panel principal para participantes. Podrás ver tus boletos activos, próximos
          sorteos y premios pendientes. Cuando definamos la lógica del dashboard, reemplazaremos este
          mensaje por widgets reales.
        </p>
      </div>
    </div>
  );
}
