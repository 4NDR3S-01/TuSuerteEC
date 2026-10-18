import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { recordAudit } from '../audit';
import { getReferralSettings } from '../settings';
import { generateReferralCode } from './referral-code';

/**
 * Recompensa del programa de referidos: cuando se aprueba el primer pago de un usuario referido,
 * quien lo invitó recibe un código personal de un solo uso. La restricción única sobre
 * `referral_rewards.referred_user_id` garantiza una sola recompensa por referido.
 */
export async function grantReferralRewardIfEligible(referredUserId: string, transactionId: string) {
  const settings = await getReferralSettings();
  if (!settings.enabled || settings.percent <= 0) return null;

  const referred = await prisma.profiles.findUnique({
    where: { id: referredUserId },
    select: { referred_by: true, full_name: true },
  });
  if (!referred?.referred_by || referred.referred_by === referredUserId) return null;

  const approvedPayments = await prisma.payment_transactions.count({
    where: { user_id: referredUserId, status: { in: ['approved', 'completed'] } },
  });
  if (approvedPayments !== 1) return null;

  const referrer = await prisma.profiles.findUnique({
    where: { id: referred.referred_by },
    select: { id: true, user: { select: { suspended_at: true } } },
  });
  if (!referrer || referrer.user?.suspended_at) return null;

  try {
    return await prisma.$transaction(async (tx) => {
      const validUntil = new Date(Date.now() + settings.validityDays * 24 * 60 * 60 * 1000);
      const code = await tx.discount_codes.create({
        data: {
          code: `REF-${generateReferralCode(8)}`,
          description: 'Recompensa por invitar a un amigo',
          discount_type: 'percent',
          value: settings.percent,
          applies_to: 'all',
          max_uses: 1,
          max_uses_per_user: 1,
          valid_until: validUntil,
          owner_user_id: referrer.id,
          source: 'referral',
        },
      });

      await tx.referral_rewards.create({
        data: { referrer_id: referrer.id, referred_user_id: referredUserId, discount_code_id: code.id, transaction_id: transactionId },
      });

      await tx.notifications.create({
        data: {
          user_id: referrer.id,
          title: 'Ganaste un código de descuento',
          message: `Una persona que invitaste completó su primer pago. Tu código ${code.code} te da ${settings.percent}% de descuento en tu próxima compra (válido hasta el ${validUntil.toLocaleDateString('es-EC')}).`,
          type: 'success',
          action_url: '/app/referidos',
        },
      });

      await recordAudit({ action: 'referral.reward', entityType: 'discount_code', entityId: code.id, data: { referrer_id: referrer.id, referred_user_id: referredUserId } }, tx);
      return code;
    });
  } catch (error) {
    // Otra aprobación simultánea ya entregó la recompensa
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
    console.error('[referrals] no se pudo entregar la recompensa', error);
    return null;
  }
}
