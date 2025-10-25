'use client';

interface Winner {
  id: string;
  created_at: string;
  user_id: string;
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
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Últimos Ganadores</h2>
          <span className="text-2xl">🏆</span>
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-3">👑</div>
          <p className="text-[color:var(--muted-foreground)] text-sm">No hay ganadores recientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Últimos Ganadores</h2>
        <span className="text-2xl">🏆</span>
      </div>
      <div className="space-y-3">
        {winners.map((winner, index) => {
          const isCurrentUser = winner.user_id === currentUserId;
          
          const getMedalEmoji = (position: number): string => {
            if (position === 0) return '🥇';
            if (position === 1) return '🥈';
            if (position === 2) return '🥉';
            return '🏅';
          };
          
          return (
            <div
              key={winner.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCurrentUser
                  ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                  : 'bg-[color:var(--muted)] border-[color:var(--border)]'
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {getMedalEmoji(index)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium truncate ${
                  isCurrentUser ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'
                }`}>
                  {winner.raffles?.title || 'Sorteo Desconocido'}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs font-semibold">(¡Tú! 🎉)</span>
                  )}
                </h3>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {new Date(winner.created_at).toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}