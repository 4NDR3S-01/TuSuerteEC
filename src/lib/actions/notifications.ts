'use server';

import { prisma, toPlain } from '../db';
import { requireAuth } from '../auth/get-user';
import { createFavoriteReminders } from '../marketing/favorites';

export async function getMyNotifications() {
  const user = await requireAuth();
  const notifications = await prisma.notifications.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  return toPlain(notifications);
}

export async function getMyUnreadNotificationsCount() {
  const user = await requireAuth();
  // Los recordatorios de favoritos se generan aquí (el contador se consulta periódicamente)
  await createFavoriteReminders(user.id);
  return prisma.notifications.count({ where: { user_id: user.id, read: false } });
}

export async function markNotificationsAsRead(notificationIds: string[]) {
  const user = await requireAuth();
  const ids = (Array.isArray(notificationIds) ? notificationIds : []).map(String).slice(0, 200);
  await prisma.notifications.updateMany({
    where: { id: { in: ids }, user_id: user.id },
    data: { read: true },
  });
}

export async function deleteNotification(notificationId: string) {
  const user = await requireAuth();
  await prisma.notifications.deleteMany({ where: { id: String(notificationId), user_id: user.id } });
}
