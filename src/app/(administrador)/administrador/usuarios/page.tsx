import { requirePagePermission } from '../../../../lib/auth/get-user';
import { prisma, toPlain } from '../../../../lib/db';
import { UsersTable } from '../../../../components/admin/users-table';
import { SectionHeader } from '../../../../components/ui/kit';
import { TeamMemberDialog } from '../../../../components/admin/team-member-dialog';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requirePagePermission('users.manage', '/administrador/usuarios');

  const profiles = await prisma.profiles.findMany({
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      phone_number: true,
      id_number: true,
      address: true,
      created_at: true,
      user: { select: { suspended_at: true, suspension_reason: true } },
      cities: { select: { name: true } },
      _count: { select: { payment_transactions: true, raffle_entries: true, winners: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const users = toPlain(profiles).map(({ user, cities, _count, ...profile }) => ({
    ...profile,
    city: cities?.name ?? null,
    suspended_at: user.suspended_at,
    suspension_reason: user.suspension_reason,
    history: _count.payment_transactions + _count.raffle_entries + _count.winners,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        title="Usuarios"
        description="Roles, suspensiones y datos de contacto. Las cuentas con historial se suspenden en lugar de eliminarse."
        action={<TeamMemberDialog />}
      />
      <UsersTable initialUsers={users} currentUserId={admin.id} />
    </div>
  );
}
