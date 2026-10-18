'use server';

import { revalidatePath } from 'next/cache';
import { prisma, toPlain } from '../db';
import { getCurrentUser } from '../auth/get-user';
import { checkRateLimit } from '../security/rate-limit';
import { getBaseUrl } from '../utils/get-base-url';

type ActionResult = { success: boolean; error?: string; favorite?: boolean };

/** Agrega o quita un sorteo de los favoritos del usuario */
export async function toggleFavoriteRaffle(raffleId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Inicia sesión para guardar sorteos.' };
  if (!checkRateLimit(`favorite:${user.id}`, { limit: 60, windowMs: 60 * 1000 }).allowed) {
    return { success: false, error: 'Demasiadas acciones seguidas. Espera un momento.' };
  }

  const raffle = await prisma.raffles.findUnique({ where: { id: String(raffleId ?? '') }, select: { id: true, status: true } });
  if (!raffle || raffle.status === 'draft') return { success: false, error: 'Sorteo no encontrado.' };

  const key = { user_id_raffle_id: { user_id: user.id, raffle_id: raffle.id } };
  const existing = await prisma.raffle_favorites.findUnique({ where: key });

  if (existing) {
    await prisma.raffle_favorites.delete({ where: key });
  } else {
    await prisma.raffle_favorites.create({ data: { user_id: user.id, raffle_id: raffle.id } }).catch(() => undefined);
  }

  revalidatePath('/app/sorteos');
  revalidatePath(`/app/sorteos/${raffle.id}`);
  return { success: true, favorite: !existing };
}

/** Datos del programa de referidos del usuario autenticado */
export async function getMyReferralSummary() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, referredCount, rewards] = await Promise.all([
    prisma.profiles.findUnique({ where: { id: user.id }, select: { referral_code: true } }),
    prisma.profiles.count({ where: { referred_by: user.id } }),
    prisma.referral_rewards.findMany({
      where: { referrer_id: user.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        created_at: true,
        discount_codes: {
          select: { code: true, value: true, valid_until: true, redemptions: { where: { status: { in: ['pending', 'confirmed'] } }, select: { id: true } } },
        },
      },
    }),
  ]);

  const code = profile?.referral_code ?? null;
  return toPlain({
    code,
    link: code ? `${getBaseUrl()}/registro?ref=${code}` : null,
    referredCount,
    rewards: rewards.map((reward) => ({
      id: reward.id,
      created_at: reward.created_at,
      code: reward.discount_codes?.code ?? null,
      percent: reward.discount_codes?.value ?? null,
      valid_until: reward.discount_codes?.valid_until ?? null,
      used: (reward.discount_codes?.redemptions.length ?? 0) > 0,
    })),
  });
}
