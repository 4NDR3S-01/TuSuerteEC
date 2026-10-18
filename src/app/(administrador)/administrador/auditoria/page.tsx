import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { requirePagePermission } from '../../../../lib/auth/get-user';
import { prisma } from '../../../../lib/db';
import { formatDateTime } from '../../../../lib/raffle/labels';
import { Badge, Card, EmptyState, SectionHeader, inputStyles, Button } from '../../../../components/ui/kit';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inicio de sesión',
  'auth.register': 'Registro',
  'auth.password_reset': 'Restablecimiento de contraseña',
  'auth.password_change': 'Cambio de contraseña',
  'user.role_change': 'Cambio de rol',
  'user.create_team_member': 'Cuenta del equipo creada',
  'user.suspend': 'Suspensión de cuenta',
  'user.reactivate': 'Reactivación de cuenta',
  'user.delete': 'Eliminación de cuenta',
  'user.email_change': 'Cambio de correo',
  'payment.request': 'Solicitud de pago',
  'payment.approve': 'Pago aprobado',
  'payment.reject': 'Pago rechazado',
  'raffle.create': 'Sorteo creado',
  'raffle.update': 'Sorteo editado',
  'raffle.status_change': 'Cambio de estado de sorteo',
  'raffle.close': 'Sorteo cerrado (compromiso publicado)',
  'raffle.draw': 'Sorteo ejecutado',
  'raffle.draw_integrity_failed': 'Integridad del sorteo fallida',
  'raffle.delete': 'Sorteo eliminado',
  'referral.reward': 'Recompensa de referido',
};

const PAGE_SIZE = 50;

type PageProps = { searchParams?: Promise<{ accion?: string; pagina?: string; entidad?: string }> };

export default async function AuditPage({ searchParams }: PageProps) {
  await requirePagePermission('audit.view', '/administrador/auditoria');
  const params = (await searchParams) ?? {};
  const page = Math.max(1, Number(params.pagina) || 1);
  const where = {
    ...(params.accion ? { action: { startsWith: params.accion } } : {}),
    ...(params.entidad && /^[0-9a-f-]{36}$/i.test(params.entidad) ? { entity_id: params.entidad } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.audit_logs.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.audit_logs.count({ where }),
  ]);
  const actorIds = Array.from(new Set(logs.map((log) => log.actor_id).filter(Boolean))) as string[];
  const actors = new Map((await prisma.profiles.findMany({ where: { id: { in: actorIds } }, select: { id: true, full_name: true } })).map((p) => [p.id, p.full_name]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = (next: number) => `?${new URLSearchParams({ ...(params.accion ? { accion: params.accion } : {}), ...(params.entidad ? { entidad: params.entidad } : {}), pagina: String(next) })}`;

  return (
    <div className="space-y-6">
      <SectionHeader as="h1" title="Auditoría" description="Registro inalterable desde la interfaz de las operaciones sensibles: quién, qué, cuándo y desde qué IP." />
      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <select name="accion" defaultValue={params.accion ?? ''} className={`${inputStyles} sm:w-72`} aria-label="Tipo de acción">
          <option value="">Todas las acciones</option>
          <option value="payment.">Pagos</option>
          <option value="raffle.">Sorteos</option>
          <option value="user.">Usuarios</option>
          <option value="auth.">Accesos</option>
          <option value="discount.">Descuentos</option>
          <option value="plan.">Planes</option>
          <option value="payment_method.">Métodos de pago</option>
          <option value="winner.">Ganadores</option>
          <option value="live_event.">Eventos</option>
        </select>
        <input name="entidad" defaultValue={params.entidad ?? ''} placeholder="ID de sorteo, pago o usuario" className={inputStyles} aria-label="ID de la entidad" />
        <Button type="submit">Filtrar</Button>
      </form>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No hay registros con estos filtros" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[color:var(--muted)]/60 text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th scope="col" className="px-4 py-3">Fecha</th>
                <th scope="col" className="px-4 py-3">Acción</th>
                <th scope="col" className="px-4 py-3">Quién</th>
                <th scope="col" className="px-4 py-3">Entidad</th>
                <th scope="col" className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)] align-top">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-[color:var(--muted-foreground)]">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={log.action.includes('failed') || log.action.includes('reject') || log.action.includes('suspend') ? 'danger' : log.action.includes('approve') || log.action.includes('draw') ? 'success' : 'neutral'}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {log.actor_id ? actors.get(log.actor_id) ?? log.actor_id.slice(0, 8) : 'Sistema'}
                    <p className="text-xs text-[color:var(--muted-foreground)]">{log.actor_role ?? ''} · {log.ip ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    {log.entity_id ? (
                      <Link href={`?entidad=${log.entity_id}`} className="font-mono text-xs hover:text-[color:var(--accent)]">{log.entity_type}:{log.entity_id.slice(0, 8)}</Link>
                    ) : (
                      log.entity_type
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    {log.data && <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-[color:var(--muted-foreground)]">{JSON.stringify(log.data, null, 1)}</pre>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-between text-sm">
          <span className="text-[color:var(--muted-foreground)]">Página {page} de {pages} · {total} registros</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="rounded-xl border border-[color:var(--border)] px-3 py-1.5 font-semibold" href={query(page - 1)}>Anterior</Link>}
            {page < pages && <Link className="rounded-xl border border-[color:var(--border)] px-3 py-1.5 font-semibold" href={query(page + 1)}>Siguiente</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
