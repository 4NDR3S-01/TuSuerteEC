import { requirePagePermission } from '../../lib/auth/get-user';

export default async function SorteoLiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar que el usuario es admin
  await requirePagePermission('raffles.draw', '/administrador/sorteos');

  // Layout limpio sin navegación para transmisión en vivo
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
