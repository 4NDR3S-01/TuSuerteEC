export default function StaffHomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">Panel de staff</h1>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Aquí podrás gestionar sorteos en vivo, confirmar ganadores y revisar reportes internos.
          Si quieres habilitar módulos específicos, dime qué funcionalidad necesitas y lo incorporamos.
        </p>
      </div>
    </div>
  );
}
