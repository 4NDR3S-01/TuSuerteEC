'use client';

import Link from 'next/link';
import { useState } from 'react';

type Raffle = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly prize_description: string;
  readonly prize_category: string | null;
  readonly image_url: string | null;
  readonly draw_date: string;
  readonly status: string;
  readonly entry_mode: string;
  readonly max_entries_per_user: number | null;
};

type Entry = {
  readonly id: string;
  readonly status: string;
  readonly ticket_number: string | null;
  readonly created_at: string;
};

type RaffleDetailPageProps = {
  raffle: Raffle;
  userEntries: Entry[];
  totalEntries: number;
  hasActiveSubscription: boolean;
};

export function RaffleDetailPage({ 
  raffle, 
  userEntries, 
  totalEntries,
  hasActiveSubscription 
}: RaffleDetailPageProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const drawDate = new Date(raffle.draw_date);
  const now = new Date();
  const daysUntil = Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isEndingSoon = daysUntil <= 3;
  const hasEnded = raffle.status === 'completed' || raffle.status === 'cancelled';
  const canParticipate = raffle.status === 'active' && !hasEnded;
  
  // Show participation count
  const userEntryCount = userEntries.length;

  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/app" className="text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)] transition-colors">
            Dashboard
          </Link>
          <span className="text-[color:var(--muted-foreground)]">/</span>
          <Link href="/app/sorteos" className="text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)] transition-colors">
            Sorteos
          </Link>
          <span className="text-[color:var(--muted-foreground)]">/</span>
          <span className="text-[color:var(--foreground)] font-semibold">{raffle.title}</span>
        </div>

        {/* Alert if ending soon */}
        {isEndingSoon && canParticipate && (
          <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">⏰</span>
              <div>
                <h3 className="font-bold text-red-600 dark:text-red-400">¡Sorteo por terminar!</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Solo quedan {daysUntil} día{daysUntil !== 1 ? 's' : ''} para participar
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Raffle Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Image */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[color:var(--border)] shadow-lg">
              {raffle.image_url ? (
                <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)] to-orange-500 flex items-center justify-center">
                  <span className="text-9xl">🎁</span>
                </div>
              )}
              {hasEnded && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-black">
                    {raffle.status === 'completed' ? '✓ FINALIZADO' : '✕ CANCELADO'}
                  </span>
                </div>
              )}
            </div>

            {/* Title and Description */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4">
              <div>
                <h1 className="text-3xl font-black text-[color:var(--foreground)] mb-2">{raffle.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] text-xs font-bold rounded-full">
                    {raffle.prize_category}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                    📅 {drawDate.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {canParticipate && (
                    <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full animate-pulse">
                      ● EN VIVO
                    </span>
                  )}
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <p className="text-[color:var(--muted-foreground)] leading-relaxed">{raffle.description}</p>
              </div>

              {/* Prize Details */}
              <div className="pt-4 border-t border-[color:var(--border)]">
                <h3 className="text-lg font-bold text-[color:var(--foreground)] mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span>Premio</span>
                </h3>
                <p className="text-[color:var(--muted-foreground)]">{raffle.prize_description}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[color:var(--foreground)]">Participaciones Totales</h3>
                <span className="text-sm font-bold text-[color:var(--accent)]">{totalEntries} participantes</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-[color:var(--muted)] rounded-lg">
                  <div className="text-2xl font-black text-[color:var(--accent)]">{totalEntries}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Total Entradas</div>
                </div>
                {Boolean(raffle.max_entries_per_user) && (
                  <div className="text-center p-3 bg-[color:var(--muted)] rounded-lg">
                    <div className="text-2xl font-black text-[color:var(--accent)]">{raffle.max_entries_per_user}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Máx. por Usuario</div>
                  </div>
                )}
              </div>
            </div>

            {/* User's Entries */}
            {userEntries.length > 0 && (
              <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[color:var(--foreground)] mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎟️</span>
                  <span>Tus Participaciones</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userEntries.map((entry, index) => (
                    <div key={entry.id} className="p-4 bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 border border-[color:var(--accent)]/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-[color:var(--muted-foreground)]">Participación #{index + 1}</div>
                          <div className="font-bold text-[color:var(--accent)]">{entry.ticket_number || `#${entry.id.slice(0, 8)}`}</div>
                          <div className="text-xs text-[color:var(--muted-foreground)] capitalize">{entry.status}</div>
                        </div>
                        <span className="text-3xl">🎫</span>
                      </div>
                      <div className="text-xs text-[color:var(--muted-foreground)] mt-2">
                        {new Date(entry.created_at).toLocaleDateString('es-EC')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold text-center">
                    ✓ Tienes {userEntries.length} participación{userEntries.length !== 1 ? 'es' : ''} en este sorteo
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            
            {/* Participation Card */}
            <div className="bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-6 sticky top-6 shadow-xl">
              
              {/* Entry Mode Info */}
              <div className="text-center mb-6 pb-6 border-b border-[color:var(--border)]">
                <div className="text-sm text-[color:var(--muted-foreground)] mb-2">Modo de Participación</div>
                <div className="text-2xl font-black text-[color:var(--accent)] capitalize">{raffle.entry_mode.replace('_', ' ')}</div>
                {Boolean(raffle.max_entries_per_user) && (
                  <div className="text-xs text-[color:var(--muted-foreground)] mt-2">
                    Máximo {raffle.max_entries_per_user} {raffle.max_entries_per_user === 1 ? 'entrada' : 'entradas'} por usuario
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canParticipate ? (
                  <>
                    {hasActiveSubscription ? (
                      <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl text-center">
                        <div className="text-2xl mb-2">✓</div>
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          Participación Automática
                        </div>
                        <div className="text-xs text-[color:var(--muted-foreground)] mt-1">
                          Tu suscripción te incluye en este sorteo
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowPurchaseModal(true)}
                        className="w-full py-4 rounded-xl font-bold transition-all text-white bg-gradient-to-r from-[color:var(--accent)] to-orange-500 hover:shadow-lg hover:scale-105"
                      >
                        Participar Ahora
                      </button>
                    )}

                    {!hasActiveSubscription && (
                      <Link
                        href="/app/planes"
                        className="block w-full py-3 text-center border-2 border-[color:var(--accent)] text-[color:var(--accent)] rounded-xl font-bold hover:bg-[color:var(--accent)] hover:text-white transition-all"
                      >
                        Ver Planes de Suscripción
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                    <div className="text-2xl mb-2">⚠️</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">
                      {raffle.status === 'completed' ? 'Sorteo Finalizado' : 'Sorteo No Disponible'}
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-[color:var(--border)] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Modo</span>
                  <span className="font-semibold text-[color:var(--foreground)] capitalize">{raffle.entry_mode.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Total Participantes</span>
                  <span className="font-semibold text-[color:var(--foreground)]">{totalEntries}</span>
                </div>
                {userEntryCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Tus Entradas</span>
                    <span className="font-semibold text-[color:var(--accent)]">{userEntryCount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Estado</span>
                  <span className={`font-semibold ${
                    canParticipate ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {canParticipate ? 'Activo' : 'Cerrado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Share Card */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6">
              <h3 className="font-bold text-[color:var(--foreground)] mb-4 flex items-center gap-2">
                <span className="text-xl">📢</span>
                <span>Compartir</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📘</span>
                </button>
                <button className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-all group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">💬</span>
                </button>
                <button className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📎</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal - Placeholder */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPurchaseModal(false)}>
          <div className="bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-[color:var(--foreground)] mb-4">Comprar Boleto</h3>
            <p className="text-[color:var(--muted-foreground)] mb-6">
              La funcionalidad de compra estará disponible próximamente.
            </p>
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="w-full py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
