'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { StatCard } from '../dashboard/stat-card';
import { SubscriptionCard } from '../dashboard/subscription-card';
import { MyEntriesCard } from '../dashboard/my-entries-card';
import { ActiveRafflesCard } from '../dashboard/active-raffles-card';
import { RecentWinnersCard } from '../dashboard/recent-winners-card';
import { RecentActivityFeed } from '../dashboard/recent-activity-feed';
import { UpcomingRafflesCalendar } from '../dashboard/upcoming-raffles-calendar';
import { QuickTipsCard } from '../dashboard/quick-tips-card';
import LiveEventAlertBar from '../dashboard/live-event-alert-bar';

type User = {
  id: string;
  email: string;
  fullName: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  benefits?: Record<string, unknown> | string[] | null;
};

type Subscription = {
  id: string;
  status: string;
  current_period_end: string;
  plans: Plan;
};

type Raffle = {
  readonly id: string;
  readonly title: string;
  readonly prize_description: string;
  readonly prize_category: string | null;
  readonly draw_date: string;
  readonly entry_mode: string;
  readonly max_entries_per_user: number | null;
  readonly status: string;
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
  winsCount?: number;
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
  winsCount = 0,
  alertEvent = null
}: Readonly<ParticipantDashboardProps>) {
  const winningEntries = myEntries.filter(entry => entry.is_winner);
  const totalWins = Math.max(winsCount, winningEntries.length);
  
  // Keyboard shortcuts para power users
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo activar con Ctrl/Cmd + tecla
      if (!e.ctrlKey && !e.metaKey) return;
      
      switch(e.key) {
        case 's':
          e.preventDefault();
          globalThis.location.href = '/app/sorteos';
          break;
        case 'p':
          e.preventDefault();
          globalThis.location.href = '/app/planes';
          break;
        case 'b':
          e.preventDefault();
          globalThis.location.href = '/app/boletos';
          break;
      }
    };

    globalThis.addEventListener('keydown', handleKeyPress);
    return () => globalThis.removeEventListener('keydown', handleKeyPress);
  }, []);
  
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
    ...(winningEntries.length > 0
      ? winningEntries.slice(0, 2).map(entry => ({
          id: `win-${entry.id}`,
          type: 'win' as const,
          title: '¡Ganaste!',
          description: entry.raffles?.title || 'Sorteo',
          timestamp: entry.created_at,
          icon: '🏆'
        }))
      : recentWinners
          .filter(winner => winner.user_id === user?.id)
          .slice(0, 2)
          .map(winner => ({
            id: `win-${winner.id}`,
            type: 'win' as const,
            title: '¡Ganaste!',
            description: winner.raffles?.title || 'Sorteo',
            timestamp: winner.created_at,
            icon: '🏆'
          })))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calcular días activos (desde la primera participación)
  const firstEntryDate = myEntries.length > 0 
    ? new Date(myEntries.at(-1)!.created_at)
    : new Date();
  const daysActive = Math.max(1, Math.ceil((Date.now() - firstEntryDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Usar el nombre completo desde Supabase
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)]/10">
      {/* Barra de alerta de evento en vivo */}
      <LiveEventAlertBar event={alertEvent} />
      
      {/* Hero Header Rediseñado */}
      <header className="relative border-b border-[color:var(--border)] bg-[color:var(--card)]/50 backdrop-blur-xl overflow-hidden">
        {/* Fondo con gradiente moderno */}
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/3 via-transparent to-blue-500/3" />
        
        {/* Grid pattern sutil */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            color: 'var(--foreground)'
          }}
        />
        
        {/* Gradient orbs más sutiles */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[color:var(--accent)]/10 to-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* User Info Section - Más limpio */}
            <div className="flex items-center gap-4">
              {/* Avatar moderno */}
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[color:var(--accent)] via-orange-500 to-pink-500 p-0.5 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  <div className="w-full h-full rounded-2xl bg-[color:var(--card)] flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl">👋</span>
                  </div>
                </div>
                {/* Status indicator mejorado */}
                <div className="absolute -bottom-1 -right-1">
                  <span className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-[color:var(--card)] shadow-lg"></span>
                  </span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-[color:var(--foreground)] to-[color:var(--foreground)]/70 bg-clip-text text-transparent">
                    ¡Bienvenido de nuevo!
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-[color:var(--muted-foreground)] font-medium">
                  {displayName}
                </p>
              </div>
            </div>
            
            {/* Action Buttons - Mejorados */}
            <div className="flex flex-wrap gap-3">
              {activeSubscriptions.length === 0 && (
                <Link
                  href="/app/planes"
                  className="group relative inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[color:var(--accent)] bg-[color:var(--background)]/50 backdrop-blur-sm px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)] transition-all duration-300 hover:shadow-lg hover:scale-105 overflow-hidden"
                >
                  <span className="relative z-10 text-lg sm:text-xl group-hover:scale-110 transition-transform">⭐</span>
                  <span className="relative z-10">Ver Planes</span>
                  <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
              <Link
                href="/app/sorteos"
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--accent)] via-orange-500 to-orange-600 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 text-lg sm:text-xl group-hover:rotate-12 transition-transform">🎁</span>
                <span className="relative z-10">Ver Sorteos</span>
                <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:py-10 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Stats Section con mejor diseño */}
        <section className="relative">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[color:var(--foreground)] flex items-center gap-2">
                <span className="text-xl sm:text-2xl">📊</span>
                <span>Resumen</span>
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mt-0.5">
                Tu actividad en un vistazo
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Suscripción"
              value={activeSubscriptions.length > 0 ? activeSubscriptions[0].plans?.name || 'Activo' : 'Sin plan'}
              icon={
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[color:var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
              description={activeSubscriptions.length > 0 ? `Hasta ${new Date(activeSubscriptions[0].current_period_end).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}` : 'Sin suscripción'}
              isText
            />
            <StatCard
              title="Participaciones"
              value={myEntries.length}
              icon={
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[color:var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              }
              description="Total de boletos"
              trend={myEntries.length > 0 ? { value: 15, isPositive: true } : undefined}
            />
            <StatCard
              title="Sorteos Activos"
              value={activeRaffles.length}
              icon={
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[color:var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              }
              description="Disponibles ahora"
              maxValue={activeRaffles.length + 3}
            />
            <StatCard
              title="Premios Ganados"
              value={totalWins}
              icon={
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[color:var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
              description={totalWins > 0 ? '¡Felicidades!' : 'Sigue participando'}
              trend={totalWins > 0 ? { value: 100, isPositive: true } : undefined}
            />
          </div>
        </section>

        {/* Grid Principal de Cards con mejor jerarquía visual */}
        <div className="space-y-6">
          {/* Fila 1: Calendario de Sorteos - Ancho Completo */}
          {myEntries.length > 0 && (
            <div className="w-full">
              <UpcomingRafflesCalendar raffles={activeRaffles} />
            </div>
          )}
          
          {/* Fila 2: Suscripción y Participaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SubscriptionCard subscriptions={activeSubscriptions} />
            <MyEntriesCard entries={myEntries} />
          </div>

          {/* Fila 3: Sorteos Activos y Últimos Ganadores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ActiveRafflesCard raffles={activeRaffles} />
            <RecentWinnersCard winners={recentWinners} currentUserId={user?.id || ''} />
          </div>
        </div>

        {/* Actividad reciente con mejor presentación */}
        {recentActivities.length > 0 && (
          <section>
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-[color:var(--foreground)] flex items-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl">🕐</span>
                <span>Actividad Reciente</span>
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">
                Tus últimos movimientos y eventos
              </p>
            </div>
            <RecentActivityFeed activities={recentActivities} />
          </section>
        )}

        {/* Tips & Best Practices */}
        <QuickTipsCard />

        {/* Estado vacío premium con mejor UX */}
        {activeSubscriptions.length === 0 && 
         myEntries.length === 0 && 
         activeRaffles.length === 0 && (
          <div className="relative mt-8 sm:mt-12 bg-gradient-to-br from-[color:var(--card)] via-[color:var(--background)] to-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-3xl p-8 sm:p-12 lg:p-16 text-center overflow-hidden">
            {/* Grid pattern decorativo */}
            <div 
              className="absolute inset-0 opacity-[0.02]" 
              style={{
                backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
                color: 'var(--foreground)'
              }}
            />
            
            {/* Gradient orbs */}
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-[color:var(--accent)]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              {/* Animated icon */}
              <div className="inline-block relative mb-6 sm:mb-8">
                <div className="text-6xl sm:text-8xl animate-bounce">🎉</div>
                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[color:var(--accent)] to-orange-500 rounded-full flex items-center justify-center animate-pulse shadow-2xl">
                  <span className="text-xl sm:text-2xl">✨</span>
                </div>
                <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse shadow-xl" style={{ animationDelay: '0.5s' }}>
                  <span className="text-lg sm:text-xl">🎯</span>
                </div>
              </div>
              
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[color:var(--foreground)] mb-3 sm:mb-4">
                ¡Comienza tu Aventura!
              </h3>
              <p className="text-[color:var(--muted-foreground)] text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
                Aún no has participado en ningún sorteo. Explora nuestros premios increíbles, suscríbete a un plan o compra boletos para comenzar a ganar hoy mismo.
              </p>
              
              {/* CTAs principales */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12">
                <Link
                  href="/app/sorteos"
                  className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 rounded-xl bg-gradient-to-r from-[color:var(--accent)] to-orange-500 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 text-xl sm:text-2xl group-hover:rotate-12 transition-transform">🎁</span>
                  <span className="relative z-10">Explorar Sorteos</span>
                  <svg className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
                <Link
                  href="/app/planes"
                  className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 rounded-xl border-2 border-[color:var(--accent)] bg-[color:var(--background)] hover:bg-[color:var(--accent)] px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-[color:var(--accent)] hover:text-white transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 text-xl sm:text-2xl group-hover:scale-110 transition-transform">⭐</span>
                  <span className="relative z-10">Ver Planes</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              </div>
              
              {/* Características destacadas con iconos SVG */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="group p-4 sm:p-5 rounded-2xl bg-[color:var(--muted)]/50 hover:bg-[color:var(--muted)] border border-[color:var(--border)] hover:border-[color:var(--accent)]/50 transition-all duration-300 hover:shadow-lg">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-[color:var(--foreground)] mb-1 sm:mb-2 text-sm sm:text-base">Participación Fácil</h4>
                  <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Participa con un solo clic</p>
                </div>
                
                <div className="group p-4 sm:p-5 rounded-2xl bg-[color:var(--muted)]/50 hover:bg-[color:var(--muted)] border border-[color:var(--border)] hover:border-[color:var(--accent)]/50 transition-all duration-300 hover:shadow-lg">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-[color:var(--foreground)] mb-1 sm:mb-2 text-sm sm:text-base">Premios Increíbles</h4>
                  <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Miles de dólares en premios</p>
                </div>
                
                <div className="group p-4 sm:p-5 rounded-2xl bg-[color:var(--muted)]/50 hover:bg-[color:var(--muted)] border border-[color:var(--border)] hover:border-[color:var(--accent)]/50 transition-all duration-300 hover:shadow-lg">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-[color:var(--foreground)] mb-1 sm:mb-2 text-sm sm:text-base">100% Transparente</h4>
                  <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Sorteos justos y verificables</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
