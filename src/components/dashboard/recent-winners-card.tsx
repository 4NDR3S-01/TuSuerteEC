'use client';

import { Trophy, Crown, Medal, Calendar, Gift, Sparkles, Star, Target } from 'lucide-react';

interface Winner {
  id: string;
  created_at: string;
  user_id: string;
  prize_position?: number;
  raffles?: {
    title: string;
  };
}

interface RecentWinnersCardProps {
  readonly winners: Winner[];
  readonly currentUserId: string;
}

export function RecentWinnersCard({ winners, currentUserId }: RecentWinnersCardProps) {
  if (!winners || winners.length === 0) {
    return (
      <div className="group relative bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 hover:border-[color:var(--accent)]/50 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[color:var(--accent)]" />
              <span>Últimos Ganadores</span>
            </h2>
            <span className="px-3 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-semibold rounded-full">
              0 Ganadores
            </span>
          </div>
          
          <div className="text-center py-8">
            <div className="mb-4 flex justify-center">
              <Crown className="w-16 h-16 text-[color:var(--muted-foreground)]" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
              Sin Ganadores Recientes
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-sm">
              Aún no hay ganadores registrados
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400 dark:text-yellow-300" />;
    if (position === 1) return <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300 dark:text-gray-400" />;
    if (position === 2) return <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 dark:text-amber-500" />;
    return <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 dark:text-blue-500" />;
  };

  const getMedalGradient = (position: number): string => {
    if (position === 0) return 'from-yellow-400 dark:from-yellow-500 via-yellow-500 dark:via-yellow-600 to-orange-500 dark:to-orange-600';
    if (position === 1) return 'from-gray-300 dark:from-gray-400 via-gray-400 dark:via-gray-500 to-gray-500 dark:to-gray-600';
    if (position === 2) return 'from-amber-600 dark:from-amber-500 via-orange-600 dark:via-orange-500 to-amber-700 dark:to-amber-600';
    return 'from-blue-400 dark:from-blue-500 via-cyan-500 dark:via-cyan-600 to-blue-600 dark:to-blue-700';
  };

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[color:var(--accent)]" />
          <span>Últimos Ganadores</span>
        </h2>
        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          {winners.length} Ganador{winners.length > 1 ? 'es' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {winners.map((winner, index) => {
          const isCurrentUser = winner.user_id === currentUserId;
          const position = index;
          const isPodium = position < 3;
          
          return (
            <div
              key={winner.id}
              className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
                isCurrentUser
                  ? 'bg-gradient-to-r from-yellow-500/20 dark:from-yellow-500/30 via-orange-500/10 dark:via-orange-500/20 to-transparent border-yellow-500/40 dark:border-yellow-500/60 hover:border-yellow-500/60 dark:hover:border-yellow-500/80 shadow-lg'
                  : isPodium
                  ? 'bg-gradient-to-r from-[color:var(--muted)] via-[color:var(--muted)]/50 to-transparent border-[color:var(--border)] hover:border-[color:var(--accent)]/50'
                  : 'bg-[color:var(--muted)] border-[color:var(--border)] hover:border-[color:var(--accent)]/30'
              } hover:shadow-md overflow-hidden`}
            >
              {/* Efecto de brillo para el usuario actual */}
              {isCurrentUser && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 dark:via-yellow-500/20 to-transparent animate-shimmer rounded-xl pointer-events-none" />
              )}

              {/* Medalla/Badge */}
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black shadow-lg transition-transform group-hover:scale-110 ${
                  isPodium
                    ? `bg-gradient-to-br ${getMedalGradient(position)}`
                    : 'bg-gradient-to-br from-[color:var(--accent)] to-orange-500'
                }`}>
                  {getMedalIcon(position)}
                </div>

                {/* Badge de posición */}
                {!isPodium && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-[color:var(--accent)] rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-black shadow z-10">
                    #{position + 1}
                  </div>
                )}

                {/* Animación especial para top 3 - SIN BLUR que se expande */}
                {isPodium && (
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-yellow-400/20 dark:from-yellow-400/30 to-transparent rounded-xl opacity-50 dark:opacity-60 animate-pulse" />
                )}
              </div>

              {/* Información del ganador */}
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`font-bold text-xs sm:text-sm line-clamp-1 flex-1 ${
                    isCurrentUser 
                      ? 'text-[color:var(--accent)]' 
                      : isPodium 
                      ? 'text-[color:var(--foreground)]' 
                      : 'text-[color:var(--foreground)]'
                  }`}>
                    {winner.raffles?.title || 'Sorteo Desconocido'}
                  </h3>
                  
                  {isCurrentUser && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-yellow-500 dark:bg-yellow-600 text-white text-[9px] sm:text-[10px] font-black rounded-full animate-bounce shadow z-10">
                      ¡TÚ!
                    </span>
                  )}
                </div>

                {/* Fecha y premio */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                  <span className="flex items-center gap-1 text-[color:var(--muted-foreground)]">
                    <Calendar className="w-3 h-3" />
                    <span className="whitespace-nowrap">{new Date(winner.created_at).toLocaleDateString('es-EC', {
                      day: 'numeric',
                      month: 'short',
                      year: new Date(winner.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}</span>
                  </span>

                  {winner.prize_position && (
                    <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-[color:var(--accent)]/10 text-[color:var(--accent)] font-semibold rounded-md whitespace-nowrap">
                      <Gift className="w-3 h-3" />
                      <span className="hidden xs:inline">Premio {winner.prize_position}°</span>
                      <span className="xs:hidden">{winner.prize_position}°</span>
                    </span>
                  )}
                </div>

                {/* Mensaje especial para el usuario actual */}
                {isCurrentUser && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-yellow-600 dark:text-yellow-400">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span className="hidden xs:inline">¡Felicidades! Eres ganador</span>
                    <span className="xs:hidden">¡Ganador!</span>
                    <Sparkles className="w-3 h-3 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Icono de ranking para top 3 */}
              {isPodium && (
                <div className="hidden sm:block absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="filter drop-shadow-lg">
                    {position === 0 && <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 dark:text-yellow-300" />}
                    {position === 1 && <Star className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 dark:text-gray-400" />}
                    {position === 2 && <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-500" />}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer con estadística */}
      <div className="mt-6 pt-4 border-t border-[color:var(--border)]">
        <div className="flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>Ganadores registrados este mes</span>
          </span>
          <span className="font-bold text-[color:var(--accent)]">{winners.length}</span>
        </div>
      </div>
    </div>
  );
}