'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminCard } from './ui/admin-card';
import { AdminMetricCard } from './ui/admin-metric-card';
import { AdminSectionHeader } from './ui/admin-section-header';
import { AdminEmptyState } from './ui/admin-empty-state';

type Metrics = {
  totalUsers: number;
  newUsersLast30Days: number;
  activeSubscriptions: number;
  activeRaffles: number;
  totalRaffles: number;
  pendingWinners: number;
  totalRevenue: number;
};

type Raffle = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type LiveEvent = {
  id: string;
  title: string;
  start_at: string;
  status: string;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
};

type AdminDashboardProps = {
  metrics: Metrics;
  recentRaffles: Raffle[];
  upcomingEvents: LiveEvent[];
  recentPayments: Payment[];
};

type StatusVariant = 'success' | 'warning' | 'default';

function statusStyles(status: string): StatusVariant {
  if (status === 'active' || status === 'live') return 'success';
  if (status === 'scheduled' || status === 'draft') return 'warning';
  return 'default';
}

function Pill({ children, variant }: { children: ReactNode; variant: StatusVariant }) {
  const styles =
    variant === 'success'
      ? 'bg-emerald-500/15 text-emerald-400'
      : variant === 'warning'
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function AdminDashboard({ metrics, recentRaffles, upcomingEvents, recentPayments }: AdminDashboardProps) {
  const conversionRate = metrics.totalUsers > 0 
    ? ((metrics.activeSubscriptions / metrics.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-10">
      <AdminCard className="border-[color:var(--border)] bg-[color:var(--muted)]/40" padding="lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Panel de control
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[color:var(--foreground)]">Bienvenido al hub administrativo</h1>
            <p className="mt-3 max-w-3xl text-sm text-[color:var(--muted-foreground)]">
              Control total de la plataforma: usuarios, sorteos, pagos, planes y configuración. Supervisa métricas
              clave y gestiona todo el ecosistema desde un solo lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/administrador/sorteos?crear=true"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] shadow-lg shadow-[rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>✨</span>
              Crear nuevo sorteo
            </Link>
            <Link
              href="/administrador/reportes"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>📊</span>
              Ver reportes
            </Link>
          </div>
        </div>
      </AdminCard>

      <section>
        <AdminSectionHeader
          title="Indicadores clave"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            title="Ganancia Total"
            description="Ingresos acumulados"
            value={`$${metrics.totalRevenue.toFixed(2)}`}
            icon="💰"
            accentFrom="from-emerald-500/20"
            accentTo="to-emerald-500/5"
          />
          <AdminMetricCard
            title="Usuarios Registrados"
            description={`+${metrics.newUsersLast30Days} últimos 30 días`}
            value={metrics.totalUsers}
            icon="👥"
            accentFrom="from-blue-500/20"
            accentTo="to-blue-500/5"
          />
          <AdminMetricCard
            title="Conversión"
            description="Usuarios a suscriptores"
            value={`${conversionRate}%`}
            icon="📈"
            accentFrom="from-purple-500/20"
            accentTo="to-purple-500/5"
          />
          <AdminMetricCard
            title="Sorteos"
            description={`${metrics.activeRaffles} activos de ${metrics.totalRaffles}`}
            value={metrics.totalRaffles}
            icon="🎁"
            accentFrom="from-amber-500/20"
            accentTo="to-amber-500/5"
          />
        </div>
      </section>

      {/* Alertas */}
      {metrics.pendingWinners > 0 && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Acción requerida
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Tienes <strong>{metrics.pendingWinners} ganadores</strong> pendientes de contacto.{' '}
                <Link href="/administrador/ganadores" className="font-semibold text-amber-600 dark:text-amber-400 underline">
                  Ver ganadores →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard>
          <AdminSectionHeader
            title="Sorteos recientes"
            description="Últimos lanzamientos y su estado operativo"
            actions={
              <Link
                href="/administrador/sorteos"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
              >
                <span aria-hidden>📋</span>
                Ver todos
              </Link>
            }
          />
          <div className="mt-6">
            {recentRaffles.length === 0 ? (
              <AdminEmptyState
                icon="🗂️"
                title="Aún no creas sorteos"
                description="Los lanzamientos aparecerán aquí para que puedas monitorear su performance rápidamente."
                action={{ label: 'Crear sorteo', href: '/administrador/sorteos' }}
              />
            ) : (
              <ul className="divide-y divide-[color:var(--border)]">
                {recentRaffles.map((raffle) => {
                  const variant = statusStyles(raffle.status);
                  return (
                    <li key={raffle.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {truncate(raffle.title, 40)}
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Creado el {new Date(raffle.created_at).toLocaleDateString('es-EC')}
                        </p>
                      </div>
                      <Pill variant={variant}>
                        {variant === 'success'
                          ? 'Activo'
                          : variant === 'warning'
                          ? raffle.status === 'draft'
                            ? 'Borrador'
                            : 'Programado'
                          : 'Finalizado'}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <AdminSectionHeader
            title="Eventos en vivo"
            description="Transmisiones próximas y activas"
            actions={
              <Link
                href="/administrador/eventos-vivo"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
              >
                <span aria-hidden>🎬</span>
                Gestionar
              </Link>
            }
          />
          <div className="mt-6">
            {upcomingEvents.length === 0 ? (
              <AdminEmptyState
                icon="🎥"
                title="Sin eventos programados"
                description="Programa un streaming para reforzar la transparencia de tus sorteos y mantener informada a la comunidad."
                action={{ label: 'Programar evento', href: '/administrador/eventos-vivo' }}
              />
            ) : (
              <ul className="space-y-4">
                {upcomingEvents.map((event) => {
                  const variant = statusStyles(event.status);
                  const date = new Date(event.start_at);

                  return (
                    <li key={event.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4 transition-colors hover:bg-[color:var(--muted)]/55">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {truncate(event.title, 36)}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })} ·{' '}
                            {date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Pill variant={variant}>
                          {variant === 'success'
                            ? 'En vivo'
                            : variant === 'warning'
                            ? 'Programado'
                            : 'Finalizado'}
                        </Pill>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>
      </section>

      <AdminCard>
        <AdminSectionHeader
          title="Pagos recientes"
          description="Últimas transacciones procesadas"
          actions={
            <Link
              href="/administrador/pagos/transacciones"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>💳</span>
              Ver todos
            </Link>
          }
        />
        <div className="mt-6">
          {recentPayments.length === 0 ? (
            <AdminEmptyState
              icon="💸"
              title="Sin pagos registrados"
              description="Las transacciones aparecerán aquí cuando los usuarios comiencen a adquirir suscripciones."
              action={{ label: 'Ver planes', href: '/administrador/planes' }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[color:var(--border)]">
                  <tr>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Usuario</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Monto</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Estado</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {recentPayments.map((payment) => {
                    const statusVariant: StatusVariant = payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'default';
                    return (
                      <tr key={payment.id} className="hover:bg-[color:var(--muted)]/30">
                        <td className="py-3 text-sm text-[color:var(--foreground)]">
                          {payment.profiles?.full_name || 'Usuario sin nombre'}
                        </td>
                        <td className="py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="py-3">
                          <Pill variant={statusVariant}>
                            {payment.status === 'completed' ? 'Completado' : payment.status === 'pending' ? 'Pendiente' : 'Fallido'}
                          </Pill>
                        </td>
                        <td className="py-3 text-xs text-[color:var(--muted-foreground)]">
                          {new Date(payment.created_at).toLocaleDateString('es-EC')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminCard>

      <AdminCard className="border-[color:var(--border)] bg-[color:var(--muted)]/30" padding="lg">
        <AdminSectionHeader
          title="Acciones rápidas"
          description="Tu panel de mando para ejecutar tareas operativas sin perder tiempo en navegación."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/administrador/sorteos?crear=true" icon="➕" label="Crear sorteo" description="Configura premios y fechas" />
          <QuickAction href="/administrador/planes" icon="🧾" label="Nuevo plan" description="Lanza suscripciones en minutos" />
          <QuickAction href="/administrador/eventos-vivo" icon="📡" label="Programar live" description="Agenda transmisiones oficiales" />
          <QuickAction href="/administrador/reportes" icon="📑" label="Ver reportes" description="Analiza métricas clave" />
        </div>
      </AdminCard>
    </div>
  );
}

type QuickActionProps = {
  href: string;
  icon: string;
  label: string;
  description: string;
};

function QuickAction({ href, icon, label, description }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-4 transition-transform hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_40px_-20px_rgba(249,115,22,0.35)]"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10 text-lg text-[color:var(--accent)] transition-transform group-hover:scale-105">
        {icon}
      </span>
      <p className="text-sm font-semibold text-[color:var(--foreground)]">{label}</p>
      <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p>
    </Link>
  );
}
