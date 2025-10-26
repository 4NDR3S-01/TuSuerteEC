'use client';

import Link from 'next/link';

interface Raffle {
  id: string;
  title: string;
  draw_date: string;
  prize_description: string;
  entry_mode?: string;
  max_entries_per_user?: number | null;
  status: string;
  is_trending?: boolean;
  prize_category?: string | null;
}

interface ActiveRafflesCardProps {
  readonly raffles: Raffle[];
}

export function ActiveRafflesCard({ raffles }: ActiveRafflesCardProps) {
  if (!raffles || raffles.length === 0) {
    return (
      <div className="group relative bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 hover:border-[color:var(--accent)]/50 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <span>Próximos Sorteos</span>
            </h2>
            <span className="px-3 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-semibold rounded-full">
              0 Activos
            </span>
          </div>
          
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-pulse">⏰</div>
            <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
              Sin Sorteos Activos
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-sm mb-2">
              No hay sorteos disponibles en este momento
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              ¡Vuelve pronto para nuevas oportunidades!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
          <span className="text-2xl">🎁</span>
          <span>Próximos Sorteos</span>
        </h2>
        <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          {raffles.length} Activo{raffles.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {raffles.slice(0, 3).map((raffle, index) => {
          const drawDate = new Date(raffle.draw_date);
          const now = new Date();
          const daysUntilDraw = Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysUntilDraw <= 3;
          const isTrending = raffle.is_trending;
          
          return (
            <Link
              key={raffle.id}
              href={`/app/sorteos/${raffle.id}`}
              className="group relative block p-4 sm:p-5 bg-gradient-to-br from-[color:var(--muted)] via-[color:var(--muted)]/80 to-transparent rounded-xl border-2 border-[color:var(--border)] hover:border-[color:var(--accent)] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-visible"
            >
              {/* Efecto de brillo en hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[color:var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

              {/* Badges superiores - Con espacio adecuado */}
              <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-20 pointer-events-none">
                {/* Badge de posición (izquierda) */}
                {index === 0 && !isTrending && (
                  <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-black rounded-full flex items-center justify-center shadow-lg">
                    #1
                  </div>
                )}
                
                {/* Spacer si no hay badge izquierdo */}
                {(index !== 0 || isTrending) && <div className="flex-1" />}
                
                {/* Badge de tendencia (derecha) */}
                {isTrending && (
                  <div className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-lg animate-pulse whitespace-nowrap">
                    <span>🔥</span>
                    <span className="hidden xs:inline">TRENDING</span>
                  </div>
                )}
              </div>

              {/* Contenido principal con padding-top para evitar overlap con badges */}
              <div className="relative flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mt-8 sm:mt-6">
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  {/* Título */}
                  <h3 className="font-bold text-sm sm:text-base text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors line-clamp-2 mb-2 pr-2">
                    {raffle.title}
                  </h3>

                  {/* Premio */}
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex-shrink-0 text-base sm:text-lg">🏆</span>
                    <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] line-clamp-2 flex-1">
                      {raffle.prize_description}
                    </p>
                  </div>

                  {/* Información del sorteo */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Fecha */}
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-sm sm:text-base">📅</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {drawDate.toLocaleDateString('es-EC', { 
                          day: 'numeric', 
                          month: 'short',
                          year: drawDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                    </div>

                    {/* Límite de participaciones si existe */}
                    {Boolean(raffle.max_entries_per_user) && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-sm sm:text-base">🎟️</span>
                        <span className="font-bold text-[color:var(--accent)]">
                          {raffle.max_entries_per_user} máx
                        </span>
                      </div>
                    )}

                    {/* Modo de entrada */}
                    {raffle.entry_mode && (
                      <div className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold whitespace-nowrap ${
                        raffle.entry_mode === 'subscribers_only'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : raffle.entry_mode === 'tickets_only'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        <span className="hidden sm:inline">
                          {raffle.entry_mode === 'subscribers_only' && '👥 SUSCRIPTORES'}
                          {raffle.entry_mode === 'tickets_only' && '🎫 BOLETOS'}
                          {raffle.entry_mode === 'hybrid' && '🎯 HÍBRIDO'}
                        </span>
                        <span className="sm:hidden">
                          {raffle.entry_mode === 'subscribers_only' && '👥'}
                          {raffle.entry_mode === 'tickets_only' && '🎫'}
                          {raffle.entry_mode === 'hybrid' && '🎯'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Countdown badge */}
                <div className="flex-shrink-0 self-end sm:self-start">
                  <div className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg ${
                    isUrgent
                      ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white animate-pulse'
                      : daysUntilDraw <= 7
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                  }`}>
                    {daysUntilDraw <= 0 ? (
                      <div className="flex flex-col items-center min-w-[3rem]">
                        <span className="text-[10px] opacity-90">HOY</span>
                        <span className="text-xl sm:text-2xl">🎲</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center min-w-[3rem]">
                        <span className="text-xl sm:text-2xl leading-none">{daysUntilDraw}</span>
                        <span className="text-[10px] opacity-90">día{daysUntilDraw > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Flecha de acción */}
              <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-[color:var(--accent)]/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                <span className="text-[color:var(--accent)] text-xs sm:text-sm font-bold">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {raffles.length > 3 && (
        <div className="mt-6 pt-4 border-t border-[color:var(--border)]">
          <Link
            href="/app/sorteos"
            className="group w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 transition-colors"
          >
            <span>Ver todos los sorteos ({raffles.length})</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}