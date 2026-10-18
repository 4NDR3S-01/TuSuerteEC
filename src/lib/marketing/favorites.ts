import 'server-only';

import { prisma } from '../db';

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Crea un aviso dentro de la app para cada sorteo favorito que cierra en las próximas 24 horas.
 * La actualización condicional de `reminded_at` garantiza un único aviso por favorito.
 */
export async function createFavoriteReminders(userId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const due = await prisma.raffle_favorites.findMany({
    where: {
      user_id: userId,
      reminded_at: null,
      raffles: { status: 'active', end_date: { gt: now, lte: soon } },
    },
    select: { raffle_id: true, raffles: { select: { title: true, end_date: true } } },
    take: 20,
  });

  for (const favorite of due) {
    const claimed = await prisma.raffle_favorites.updateMany({
      where: { user_id: userId, raffle_id: favorite.raffle_id, reminded_at: null },
      data: { reminded_at: now },
    });
    if (claimed.count === 0) continue;

    await prisma.notifications.create({
      data: {
        user_id: userId,
        title: 'Un sorteo que guardaste está por cerrar',
        message: `"${favorite.raffles.title}" cierra el ${favorite.raffles.end_date?.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' })}.`,
        type: 'info',
        action_url: `/app/sorteos/${favorite.raffle_id}`,
      },
    });
  }
}
