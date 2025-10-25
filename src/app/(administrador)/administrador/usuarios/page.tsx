import { requireRole } from '../../../../lib/auth/get-user';
export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { AdminCard } from '../../../../components/admin/ui/admin-card';
import { AdminMetricCard } from '../../../../components/admin/ui/admin-metric-card';
import { AdminSectionHeader } from '../../../../components/admin/ui/admin-section-header';
import { UsersTable } from '../../../../components/admin/users-table';

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  phone_number: string | null;
  id_number: string | null;
  address: string | null;
  created_at: string | null;
};

type RolesSummary = {
  total: number;
  admins: number;
  staff: number;
  participants: number;
};

function formatRole(value: string | null | undefined) {
  if (!value) return 'Sin asignar';
  const roles: Record<string, string> = {
    admin: 'Administrador',
    staff: 'Staff',
    participant: 'Participante',
  };
  return roles[value] ?? value;
}

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) return '';
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function AdminUsersPage() {
  await requireRole('admin');

  const supabase = await getSupabaseServerClient();

  const [
    profilesResponse,
    totalResponse,
    adminsResponse,
    staffResponse,
    participantsResponse,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, phone_number, id_number, address, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'participant'),
  ]);

  const profiles: ProfileRecord[] = profilesResponse.data ?? [];
  
  if (profilesResponse.error) {
    console.error('Error loading profiles:', profilesResponse.error);
  }
  const summary: RolesSummary = {
    total: totalResponse.count ?? 0,
    admins: adminsResponse.count ?? 0,
    staff: staffResponse.count ?? 0,
    participants: participantsResponse.count ?? 0,
  };

  return (
    <div className="space-y-10">
      <AdminCard className="border-[color:var(--border)] bg-[color:var(--muted)]/40" padding="lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Gestión de usuarios
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[color:var(--foreground)]">
              Consolida y controla tu base de miembros
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-[color:var(--muted-foreground)]">
              Monitorea participantes y staff desde un solo lugar. Gestiona roles, permisos y mantén tu ecosistema organizado con control total sobre los usuarios de la plataforma.
            </p>
          </div>
        </div>
      </AdminCard>

      <section>
        <AdminSectionHeader
          title="Composición actual"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            title="Usuarios totales"
            description="Miembros registrados en la plataforma"
            value={summary.total}
            icon="👥"
            accentFrom="from-indigo-500/20"
            accentTo="to-indigo-500/5"
          />
          <AdminMetricCard
            title="Administradores"
            description="Cuentas con control completo"
            value={summary.admins}
            icon="🛡️"
            accentFrom="from-blue-500/20"
            accentTo="to-blue-500/5"
          />
          <AdminMetricCard
            title="Staff operativo"
            description="Equipo que ejecuta sorteos y entregas"
            value={summary.staff}
            icon="🧑‍💼"
            accentFrom="from-emerald-500/20"
            accentTo="to-emerald-500/5"
          />
          <AdminMetricCard
            title="Participantes"
            description="Usuarios listos para participar"
            value={summary.participants}
            icon="🎟️"
            accentFrom="from-purple-500/20"
            accentTo="to-purple-500/5"
          />
        </div>
      </section>

      <UsersTable initialUsers={profiles} totalCount={summary.total} />
    </div>
  );
}
