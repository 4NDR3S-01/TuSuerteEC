import { requirePagePermission } from '../../../../lib/auth/get-user';
import { prisma, toPlain } from '../../../../lib/db';
import { getReferralSettings } from '../../../../lib/settings';
import { MarketingManagement } from '../../../../components/admin/marketing-management';
import { SectionHeader } from '../../../../components/ui/kit';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  await requirePagePermission('discounts.manage', '/administrador/marketing');

  const [codes, raffles, settings, referralStats] = await Promise.all([
    prisma.discount_codes.findMany({
      where: { source: 'admin' },
      orderBy: { created_at: 'desc' },
      include: {
        raffles: { select: { title: true } },
        _count: { select: { redemptions: { where: { status: { in: ['pending', 'confirmed'] } } } } },
      },
    }),
    prisma.raffles.findMany({ where: { status: { in: ['draft', 'active'] } }, select: { id: true, title: true }, orderBy: { created_at: 'desc' } }),
    getReferralSettings(),
    Promise.all([
      prisma.profiles.count({ where: { referred_by: { not: null } } }),
      prisma.referral_rewards.count(),
      prisma.discount_redemptions.count({ where: { status: 'confirmed', discount_codes: { source: 'referral' } } }),
    ]),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader as="h1" title="Descuentos y referidos" description="Crea códigos con vigencia y límites. Los usos solo cuentan cuando el pago no se rechaza." />
      <MarketingManagement
        codes={toPlain(codes).map(({ _count, raffles: raffle, ...code }) => ({ ...code, uses: _count.redemptions, raffle_title: raffle?.title ?? null }))}
        raffles={raffles}
        settings={settings}
        referralStats={{ referred: referralStats[0], rewards: referralStats[1], redeemed: referralStats[2] }}
      />
    </div>
  );
}
