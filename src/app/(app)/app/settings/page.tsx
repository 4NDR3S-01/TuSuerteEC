import { prisma, toPlain } from '../../../../lib/db';
import { requirePageUser } from '../../../../lib/auth/get-user';
import { SettingsPage } from '../../../../components/settings/settings-page';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<{ tab?: string }> };

export default async function Settings({ searchParams }: PageProps) {
  const user = await requirePageUser('/app/settings');
  const tab = (await searchParams)?.tab;

  const subscriptions = await prisma.subscriptions.findMany({
    where: { user_id: user.id, status: 'active', current_period_end: { gt: new Date() } },
    select: { id: true, current_period_end: true, plans: { select: { name: true, price: true, interval: true } } },
  });

  return (
    <SettingsPage
      email={user.email}
      mustChangePassword={user.mustChangePassword}
      profile={{ full_name: user.fullName, phone_number: user.phoneNumber, id_number: user.idNumber, address: user.address }}
      subscriptions={toPlain(subscriptions)}
      initialTab={tab === 'seguridad' || tab === 'plan' || tab === 'comunicaciones' ? tab : 'perfil'}
    />
  );
}
