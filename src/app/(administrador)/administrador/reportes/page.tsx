import Link from 'next/link';
import { requireRole } from '../../../../lib/auth/get-user';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { AdminCard } from '../../../../components/admin/ui/admin-card';
import { AdminMetricCard } from '../../../../components/admin/ui/admin-metric-card';
import { AdminSectionHeader } from '../../../../components/admin/ui/admin-section-header';
import { AdminEmptyState } from '../../../../components/admin/ui/admin-empty-state';

export const dynamic = 'force-dynamic';

type MonthlyMetric = {
  label: string;
  totalEntries: number;
};

type EntryRecord = {
  raffle_id: string | null;
  created_at: string;
  raffles: {
    title: string | null;
  } | null | { title: string | null }[];
};

type WinnerRecord = {
  raffle_id: string | null;
  raffles: {
    title: string | null;
  } | null | { title: string | null }[];
};

type TopRaffleMetric = {
  raffleId: string;
  title: string;
  totalEntries: number;
  totalWinners: number;
};

type SummaryMetrics = {
  raffles: number;
  entries: number;
  winners: number;
  activeSubscriptions: number;
};

function formatMonth(date: Date) {
  return date.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' });
}

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) return '';
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export default async function AdminReportsPage() {
  await requireRole('admin');

  const supabase = await getSupabaseServerClient();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const nowISO = new Date().toISOString();

  const [
    rafflesCountResponse,
    entriesCountResponse,
    winnersCountResponse,
    subscriptionsCountResponse,
    entriesResponse,
    winnersResponse,
  ] = await Promise.all([
    supabase.from('raffles').select('*', { count: 'exact', head: true }),
    supabase.from('raffle_entries').select('*', { count: 'exact', head: true }),
    supabase.from('winners').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gt('current_period_end', nowISO),
    supabase
      .from('raffle_entries')
      .select(
        `
        raffle_id,
        created_at,
        raffles!inner(title)
      `,
      )
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1200),
    supabase
      .from('winners')
      .select(
        `
        raffle_id,
        raffles!inner(title)
      `,
      )
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(600),
  ]);

  const summary: SummaryMetrics = {
    raffles: rafflesCountResponse.count ?? 0,
    entries: entriesCountResponse.count ?? 0,
    winners: winnersCountResponse.count ?? 0,
    activeSubscriptions: subscriptionsCountResponse.count ?? 0,
  };

  const monthlyEntries: MonthlyMetric[] = buildMonthlyEntries(entriesResponse.data ?? [], sixMonthsAgo, now);
  const topRaffles: TopRaffleMetric[] = buildTopRaffles(entriesResponse.data ?? [], winnersResponse.data ?? []);

  return (
    <div className="space-y-10">
      <AdminCard className="border-[color:var(--border)] bg-[color:var(--muted)]/40" padding="lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Inteligencia operativa
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[color:var(--foreground)]">
              Reportes centralizados para decisiones ágiles
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-[color:var(--muted-foreground)]">
              Analiza el comportamiento de tus sorteos, el rendimiento de las campañas y la evolución de la base de usuarios desde un solo tablero.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:soporte@tusuerte.com?subject=Solicitar%20reporte%20personalizado"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>📩</span>
              Pedir reporte personalizado
            </a>
            <Link
              href="/administrador/ganadores"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] shadow-lg shadow-[rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>🏆</span>
              Ver seguimiento de ganadores
            </Link>
          </div>
        </div>
      </AdminCard>

      <section>
        <AdminSectionHeader
          title="Indicadores clave"
          description="Actualización en tiempo real"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            title="Sorteos creados"
            description="Campañas lanzadas históricamente"
            value={summary.raffles}
            icon="🎯"
            accentFrom="from-indigo-500/20"
            accentTo="to-indigo-500/5"
          />
          <AdminMetricCard
            title="Participaciones registradas"
            description="Tickets generados por usuarios"
            value={summary.entries}
            icon="🎟️"
            accentFrom="from-teal-500/20"
            accentTo="to-teal-500/5"
          />
          <AdminMetricCard
            title="Ganadores confirmados"
            description="Premios otorgados en total"
            value={summary.winners}
            icon="🏆"
            accentFrom="from-amber-500/20"
            accentTo="to-amber-500/5"
          />
          <AdminMetricCard
            title="Suscripciones activas"
            description="Ingresos recurrentes al día de hoy"
            value={summary.activeSubscriptions}
            icon="💼"
            accentFrom="from-rose-500/20"
            accentTo="to-rose-500/5"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <AdminCard>
          <AdminSectionHeader
            title="Participaciones mensuales"
            description="Tendencia en los últimos seis meses"
            actions={
              <Link
                href="/administrador/sorteos"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
              >
                <span aria-hidden>⚡</span>
                Optimizar campañas
              </Link>
            }
          />
          <MonthlyEntriesChart data={monthlyEntries} />
        </AdminCard>

        <AdminCard>
          <AdminSectionHeader
            title="Top sorteos recientes"
            description="Actividad medida por tickets y premios generados"
          />
          <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--border)]">
            <table className="min-w-full divide-y divide-[color:var(--border)] text-sm">
              <thead className="bg-[color:var(--muted)]/40 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Sorteo</th>
                  <th className="px-4 py-3 text-right font-semibold">Entradas</th>
                  <th className="px-4 py-3 text-right font-semibold">Ganadores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--background)]/60">
                {topRaffles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                      Aún no hay suficiente actividad para generar un ranking. Los sorteos recientes aparecerán aquí en cuanto percibamos movimiento.
                    </td>
                  </tr>
                ) : (
                  topRaffles.map((raffle) => (
                    <tr key={raffle.raffleId} className="transition-colors hover:bg-[color:var(--muted)]/20">
                      <td className="px-4 py-4 text-[color:var(--foreground)]">
                        {truncate(raffle.title ?? 'Sorteo sin nombre', 36)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-[color:var(--foreground)]">
                        {raffle.totalEntries.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[color:var(--muted-foreground)]">
                        {raffle.totalWinners.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="border-[color:var(--border)] bg-[color:var(--muted)]/30">
          <AdminSectionHeader
            title="Recomendaciones rápidas"
            description="Ideas tácticas para mantener la operación saludable"
            align="start"
          />
          <ul className="mt-4 space-y-3 text-sm text-[color:var(--muted-foreground)]">
            <li>
              <span className="font-semibold text-[color:var(--foreground)]">Activa campañas de re-engagement:</span> identifica a usuarios que no participan en los últimos 60 días y envía un incentivo.
            </li>
            <li>
              <span className="font-semibold text-[color:var(--foreground)]">Promueve sorteos con baja tracción:</span> refuerza la comunicación en redes o correo cuando veas tickets por debajo del promedio.
            </li>
            <li>
              <span className="font-semibold text-[color:var(--foreground)]">Planifica entregas de premios:</span> coordina con el equipo logístico para cerrar rápidamente los pendientes y evitar acumulaciones.
            </li>
          </ul>
        </AdminCard>

        <AdminCard className="border-[color:var(--border)] bg-[color:var(--muted)]/30">
          <AdminSectionHeader
            title="Exportaciones disponibles"
            description="Solicita a soporte los archivos en formato Excel o CSV"
            align="start"
          />
          <div className="mt-4 grid gap-2 text-sm text-[color:var(--muted-foreground)]">
            <span>• Histórico de sorteos con métricas clave</span>
            <span>• Participaciones detalladas por usuario</span>
            <span>• Estado de entrega de premios</span>
            <span>• Suscripciones y recurrencia</span>
          </div>
        </AdminCard>
      </section>
    </div>
  );
}

function buildMonthlyEntries(entries: EntryRecord[], from: Date, to: Date): MonthlyMetric[] {
  const months: MonthlyMetric[] = [];
  const monthPointer = new Date(from);

  while (monthPointer <= to) {
    months.push({
      label: formatMonth(monthPointer),
      totalEntries: 0,
    });
    monthPointer.setMonth(monthPointer.getMonth() + 1);
  }

  const monthIndex = new Map<string, number>();
  months.forEach((month, index) => {
    monthIndex.set(month.label, index);
  });

  entries.forEach((entry) => {
    const createdAt = new Date(entry.created_at);
    const label = formatMonth(createdAt);
    const index = monthIndex.get(label);
    if (index !== undefined) {
      months[index].totalEntries += 1;
    }
  });

  return months;
}

function buildTopRaffles(entries: EntryRecord[], winners: WinnerRecord[]): TopRaffleMetric[] {
  const map = new Map<string, TopRaffleMetric>();

  entries.forEach((entry) => {
    if (!entry.raffle_id) {
      return;
    }
    const raffleTitle = Array.isArray(entry.raffles) 
      ? entry.raffles[0]?.title ?? 'Sorteo sin nombre'
      : entry.raffles?.title ?? 'Sorteo sin nombre';
      
    if (!map.has(entry.raffle_id)) {
      map.set(entry.raffle_id, {
        raffleId: entry.raffle_id,
        title: raffleTitle,
        totalEntries: 0,
        totalWinners: 0,
      });
    }
    const item = map.get(entry.raffle_id)!;
    item.totalEntries += 1;
  });

  winners.forEach((winner) => {
    if (!winner.raffle_id) {
      return;
    }
    const raffleTitle = Array.isArray(winner.raffles) 
      ? winner.raffles[0]?.title ?? 'Sorteo sin nombre'
      : winner.raffles?.title ?? 'Sorteo sin nombre';
      
    if (!map.has(winner.raffle_id)) {
      map.set(winner.raffle_id, {
        raffleId: winner.raffle_id,
        title: raffleTitle,
        totalEntries: 0,
        totalWinners: 0,
      });
    }
    const item = map.get(winner.raffle_id)!;
    item.totalWinners += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => b.totalEntries - a.totalEntries)
    .slice(0, 8);
}

function MonthlyEntriesChart({ data }: { data: MonthlyMetric[] }) {
  const max = Math.max(...data.map((item) => item.totalEntries), 1);

  if (data.length === 0) {
    return (
      <div className="mt-6">
        <AdminEmptyState
          icon="📉"
          title="Sin participaciones registradas"
          description="Aún no hay actividad suficiente para mostrar una tendencia."
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => {
        const heightPercent = Math.max((item.totalEntries / max) * 100, 6);
        return (
          <div key={item.label} className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
            <div className="flex h-24 w-full items-end rounded-xl bg-[color:var(--background)]/70 p-3">
              <div
                className="w-full rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent)]/60 transition-all"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{item.label}</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {item.totalEntries.toLocaleString()} participaciones
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
