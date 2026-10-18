'use server';

import { prisma } from '../db';
import { getCurrentUser } from '../auth/get-user';
import { can } from '../auth/roles';

export type OpsAlert = { id: string; title: string; description: string; href: string; tone: 'warning' | 'info' | 'danger' };

/**
 * Alertas operativas reales (calculadas desde la base de datos) para el panel del staff y del admin.
 * Cada alerta solo se muestra a quien tiene permiso para resolverla.
 */
export async function getOpsAlerts(basePath: '/administrador' | '/staff'): Promise<OpsAlert[]> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'staff_panel.access')) return [];

  const now = new Date();
  const [pendingPayments, pendingWinners, toClose, toDraw] = await Promise.all([
    can(user.role, 'payments.review') ? prisma.payment_transactions.count({ where: { status: 'pending' } }) : 0,
    can(user.role, 'winners.manage') ? prisma.winners.count({ where: { status: 'pending_contact' } }) : 0,
    can(user.role, 'raffles.manage') ? prisma.raffles.count({ where: { status: 'active', end_date: { lte: now } } }) : 0,
    can(user.role, 'raffles.draw') ? prisma.raffles.count({ where: { status: 'closed', draw_date: { lte: now } } }) : 0,
  ]);

  const paymentsHref = basePath === '/administrador' ? '/administrador/pagos/transacciones' : '/staff/pagos';
  const alerts: OpsAlert[] = [];
  if (pendingPayments) alerts.push({ id: 'payments', title: 'Pagos por revisar', description: `${pendingPayments} comprobante(s) esperan verificación.`, href: paymentsHref, tone: 'warning' });
  if (pendingWinners) alerts.push({ id: 'winners', title: 'Ganadores sin contactar', description: `${pendingWinners} ganador(es) pendientes de contacto.`, href: `${basePath}/ganadores`, tone: 'info' });
  if (toClose) alerts.push({ id: 'close', title: 'Sorteos por cerrar', description: `${toClose} sorteo(s) pasaron su fecha de cierre y siguen abiertos.`, href: '/administrador/sorteos', tone: 'danger' });
  if (toDraw) alerts.push({ id: 'draw', title: 'Sorteos por ejecutar', description: `${toDraw} sorteo(s) cerrados llegaron a su fecha de sorteo.`, href: '/administrador/sorteos', tone: 'warning' });
  return alerts;
}
