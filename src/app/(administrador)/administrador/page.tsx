export default function AdminHomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">Panel de administrador</h1>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Aún no has definido el contenido de esta sección. Desde aquí podrás gestionar sorteos,
          revisar reportes y configurar la plataforma. Si deseas un dashboard real, cuéntame qué módulos
          necesitas y lo diseñamos.
        </p>
      </div>
    </div>
  );
}
