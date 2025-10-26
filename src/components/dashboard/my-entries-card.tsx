'use client';

import Link from 'next/link';

interface RaffleEntry {
  id: string;
  ticket_number: string;
  created_at: string;
  is_winner?: boolean;
  raffles?: {
    title: string;
    draw_date: string;
    prize_description: string;
  };
}

interface MyEntriesCardProps {
  readonly entries: RaffleEntry[];
}

export function MyEntriesCard({ entries }: MyEntriesCardProps) {
  const winningEntries = entries.filter(e => e.is_winner);
  
  if (!entries || entries.length === 0) {
    return (
      <div className="group relative bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 hover:border-[color:var(--accent)]/50 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
              <span className="text-2xl">🎫</span>
              <span>Mis Participaciones</span>
            </h2>
            <span className="px-3 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-semibold rounded-full">
              0 Boletos
            </span>
          </div>
          
          <div className="text-center py-8">
            <div className="relative inline-block mb-4">
              <div className="text-6xl animate-pulse">🎯</div>
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
              Sin Participaciones
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-sm mb-6 max-w-xs mx-auto">
              Aún no has participado en ningún sorteo. ¡Empieza ahora y gana premios increíbles!
            </p>
            <Link 
              href="/app/sorteos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <span>🎁</span>
              <span>Ver Sorteos Activos</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
          <span className="text-2xl">🎫</span>
          <span>Mis Participaciones</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] text-xs font-bold rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-[color:var(--accent)] rounded-full animate-pulse" />
            {entries.length} {entries.length === 1 ? 'Boleto' : 'Boletos'}
          </span>
          {winningEntries.length > 0 && (
            <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
              <span>�</span>
              {winningEntries.length} Ganador{winningEntries.length > 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[color:var(--accent)] scrollbar-track-[color:var(--muted)]">
        {entries.slice(0, 5).map((entry) => {
          const drawDate = entry.raffles?.draw_date ? new Date(entry.raffles.draw_date) : null;
          const isPending = drawDate && drawDate > new Date();
          const isWinner = entry.is_winner;

          return (
            <div
              key={entry.id}
              className={`group relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                isWinner
                  ? 'bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-transparent border-yellow-500/30 hover:border-yellow-500/50 shadow-md'
                  : 'bg-[color:var(--muted)] border-[color:var(--border)] hover:border-[color:var(--accent)]/50'
              } hover:shadow-lg overflow-hidden`}
            >
              {/* Efecto de brillo para ganadores */}
              {isWinner && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              )}

              {/* Número de boleto */}
              <div className={`relative flex-shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center text-white font-black shadow-lg ${
                isWinner
                  ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500'
                  : 'bg-gradient-to-br from-[color:var(--accent)] to-orange-500'
              }`}>
                <span className="text-[10px] opacity-75">BOLETO</span>
                <span className="text-base leading-none">#{entry.ticket_number}</span>
                {isWinner && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <span className="text-lg">🏆</span>
                  </div>
                )}
              </div>

              {/* Información del sorteo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`font-bold text-sm ${isWinner ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'} truncate`}>
                    {entry.raffles?.title || 'Sorteo Desconocido'}
                  </h3>
                  {isPending && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full">
                      PENDIENTE
                    </span>
                  )}
                </div>

                {entry.raffles?.prize_description && (
                  <p className="text-xs text-[color:var(--muted-foreground)] mb-2 line-clamp-1">
                    🎁 {entry.raffles.prize_description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[color:var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <span>📅</span>
                    <span>Registro: {new Date(entry.created_at).toLocaleDateString('es-EC', {
                      day: 'numeric',
                      month: 'short'
                    })}</span>
                  </span>
                  {drawDate && (
                    <span className={`flex items-center gap-1 ${isWinner ? 'text-[color:var(--accent)] font-semibold' : ''}`}>
                      <span>🎲</span>
                      <span>Sorteo: {drawDate.toLocaleDateString('es-EC', {
                        day: 'numeric',
                        month: 'short'
                      })}</span>
                    </span>
                  )}
                </div>

                {isWinner && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                    <span className="animate-pulse">✨</span>
                    <span>¡GANADOR! Felicidades</span>
                    <span className="animate-pulse">✨</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > 5 && (
        <div className="mt-6 pt-4 border-t border-[color:var(--border)]">
          <Link
            href="/app/boletos"
            className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 transition-colors group"
          >
            <span>Ver todas mis participaciones ({entries.length})</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}