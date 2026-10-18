import { Card, SectionHeader } from '../ui/kit';
import { SecuritySettings } from './security-settings';
import type { User } from '../../lib/auth/get-user';

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', staff: 'Staff' };

/** "Mi cuenta" para el personal (staff y administradores) */
export function TeamAccountPage({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <SectionHeader as="h1" title="Mi cuenta" description="Tus datos de acceso al panel." />
      <Card className="grid gap-4 p-6 text-sm sm:grid-cols-2">
        {[
          ['Nombre', user.fullName],
          ['Correo', user.email],
          ['Rol', ROLE_LABELS[user.role] ?? user.role],
          ['Teléfono', user.phoneNumber],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[color:var(--muted-foreground)]">{label}</p>
            <p className="break-all font-semibold">{value}</p>
          </div>
        ))}
      </Card>
      <Card className="p-6">
        <SecuritySettings mustChangePassword={user.mustChangePassword} />
      </Card>
    </div>
  );
}
