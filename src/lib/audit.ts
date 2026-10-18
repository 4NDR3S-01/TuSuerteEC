import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { getClientIp } from './security/request';

type AuditEntry = {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
};

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Registra una operación sensible en `audit_logs`.
 * Dentro de una transacción, pasa `tx` para que el registro se confirme junto con la operación.
 */
export async function recordAudit(entry: AuditEntry, db: Db = prisma) {
  try {
    await db.audit_logs.create({
      data: {
        actor_id: entry.actorId ?? null,
        actor_role: entry.actorRole ?? null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        data: (entry.data ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: await getClientIp(),
      },
    });
  } catch (error) {
    // Dentro de una transacción el error debe propagarse para no confirmar sin auditoría
    if (db !== prisma) throw error;
    console.error('[audit] no se pudo registrar', entry.action, error);
  }
}
