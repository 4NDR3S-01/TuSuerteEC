'use client';

import Link from 'next/link';
import { StatCard } from '../dashboard/stat-card';
import { SubscriptionCard } from '../dashboard/subscription-card';
import { MyEntriesCard } from '../dashboard/my-entries-card';
import { ActiveRafflesCard } from '../dashboard/active-raffles-card';
import { RecentWinnersCard } from '../dashboard/recent-winners-card';
import { QuickActionsGrid } from '../dashboard/quick-actions-grid';
import { RecentActivityFeed } from '../dashboard/recent-activity-feed';
import LiveEventAlertBar from '../dashboard/live-event-alert-bar';

type User = {
  id: string;
  email: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
};

type Subscription = {
  id: string;
  status: string;
  current_period_end: string;
  plans: Plan;
};

type Raffle = {
  id: string;
  title: string;
  prize_description: string;
  draw_date: string;
  entry_mode: string;
  ticket_price: number;
  total_tickets: number;
  status: string;
};

type RaffleEntry = {
  id: string;
  raffle_id: string;
  entry_source: string;
  ticket_number: string;
  is_winner: boolean;
  created_at: string;
  raffles: Raffle;
};

type Winner = {
  id: string;
  user_id: string;
  prize_position: number;
  status: string;
  created_at: string;
  raffles: {
    title: string;
  };
};

type ParticipantDashboardProps = {
  user: User | null;
  activeSubscriptions: Subscription[];
  activeRaffles: Raffle[];
  myEntries: RaffleEntry[];
  recentWinners: Winner[];
  alertEvent?: {
    id: string;
    title: string;
    description: string | null;
    start_at: string;
    stream_url: string | null;
    status: string;
  } | null;
};

export function ParticipantDashboard({ 
  user, 
  activeSubscriptions, 
  activeRaffles, 
  myEntries, 
  recentWinners,
  alertEvent = null
}: Readonly<ParticipantDashboardProps>) {
  const totalWins = myEntries.filter(entry => entry.is_winner).length;
  
  const recentActivities = [
    ...myEntries.slice(0, 3).map(entry => ({
      id: entry.id,
      type: 'entry' as const,
      title: 'Nueva participación',
      description: entry.raffles?.title || 'Sorteo Desconocido',
      timestamp: entry.created_at,
      icon: '🎫'
    })),
    ...activeSubscriptions.slice(0, 2).map(sub => ({
      id: sub.id,
      type: 'subscription' as const,
      title: 'Suscripción activa',
      description: sub.plans?.name || 'Plan',
      timestamp: sub.current_period_end,
      icon: '💳'
    })),
    ...myEntries.filter(e => e.is_winner).slice(0, 2).map(entry => ({
      id: `win-${entry.id}`,
      type: 'win' as const,
      title: '¡Ganaste!',
      description: entry.raffles?.title || 'Sorteo',
      timestamp: entry.created_at,
      icon: '🏆'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Barra de alerta de evento en vivo */}
      <LiveEventAlertBar event={alertEvent} />
      
      <header className="border-b border-[color:var(--border)] bg-gradient-to-r from-[color:var(--muted)] to-[color:var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-[color:var(--foreground)] flex items-center gap-3">
                <span className="text-4xl">👋</span>
                <span>¡Hola de nuevo!</span>
              </h1>
              <p className="mt-2 text-sm lg:text-base text-[color:var(--muted-foreground)]">
                Bienvenido a tu panel, <span className="font-medium text-[color:var(--accent)]">{user?.email}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/planes"
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] transition-colors"
              >
                <span>⭐</span>
                Ver Planes
              </Link>
              <Link
                href="/sorteos"
                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] hover:opacity-90 transition-opacity shadow-md"
              >
                <span>🎁</span>
                Ver Sorteos
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)] mb-4 flex items-center gap-2">
            <span>📊</span>
            Resumen de tu Actividad
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Suscripciones"
              value={activeSubscriptions.length}
              icon={<span className="text-2xl">💳</span>}
              description={activeSubscriptions.length > 0 ? 'Activas ahora' : 'Sin suscripción'}
            />
            <StatCard
              title="Participaciones"
              value={myEntries.length}
              icon={<span className="text-2xl">🎫</span>}
              description="Total de boletos"
            />
            <StatCard
              title="Sorteos Activos"
              value={activeRaffles.length}
              icon={<span className="text-2xl">🎁</span>}
              description="Disponibles ahora"
            />
            <StatCard
              title="Premios Ganados"
              value={totalWins}
              icon={<span className="text-2xl">🏆</span>}
              description={totalWins > 0 ? '¡Felicidades!' : 'Sigue participando'}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)] mb-4 flex items-center gap-2">
            <span>⚡</span>
            Acciones Rápidas
          </h2>
          <QuickActionsGrid />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SubscriptionCard subscriptions={activeSubscriptions} />
          <MyEntriesCard entries={myEntries} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ActiveRafflesCard raffles={activeRaffles} />
          <RecentWinnersCard winners={recentWinners} currentUserId={user?.id || ''} />
        </div>

        {recentActivities.length > 0 && (
          <div>
            <RecentActivityFeed activities={recentActivities} />
          </div>
        )}

        {activeSubscriptions.length === 0 && 
         myEntries.length === 0 && 
         activeRaffles.length === 0 && (
          <div className="mt-12 bg-gradient-to-br from-[color:var(--muted)] to-[color:var(--background)] border border-[color:var(--border)] rounded-2xl p-12 text-center">
            <div className="text-7xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-[color:var(--foreground)] mb-2">
              ¡Comienza tu Aventura!
            </h3>
            <p className="text-[color:var(--muted-foreground)] mb-6 max-w-md mx-auto">
              Aún no has participado en ningún sorteo. ¡Explora nuestros premios increíbles y comienza a ganar!
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/sorteos"
                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-6 py-3 text-base font-medium text-[color:var(--accent-foreground)] hover:opacity-90 transition-opacity shadow-lg"
              >
                <span>🎁</span>
                Ver Sorteos Activos
              </Link>
              <Link
                href="/planes"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-[color:var(--accent)] px-6 py-3 text-base font-medium text-[color:var(--accent)] hover:bg-[color:var(--accent)]/10 transition-colors"
              >
                <span>⭐</span>
                Ver Planes de Suscripción
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
