'use client';

interface RaffleEntry {
  id: string;
  ticket_number: string;
  created_at: string;
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
  if (!entries || entries.length === 0) {
    return (
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Mis Participaciones</h2>
          <span className="text-2xl">🎫</span>
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-[color:var(--muted-foreground)] text-sm">Aún no has participado en ningún sorteo</p>
          <button className="mt-4 px-4 py-2 bg-[color:var(--accent)] text-[color:var(--accent-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Ver Sorteos Activos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Mis Participaciones</h2>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] text-xs font-semibold rounded-full">
            {entries.length} {entries.length === 1 ? 'boleto' : 'boletos'}
          </span>
          <span className="text-2xl">🎫</span>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {entries.slice(0, 5).map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-4 bg-[color:var(--muted)] rounded-lg border border-[color:var(--border)] hover:border-[color:var(--accent)] transition-colors"
          >
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              #{entry.ticket_number}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[color:var(--foreground)] truncate">
                {entry.raffles?.title || 'Sorteo Desconocido'}
              </h3>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
                Participaste el {new Date(entry.created_at).toLocaleDateString('es-EC', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
              {entry.raffles?.draw_date && (
                <p className="text-xs text-[color:var(--accent)] mt-1 flex items-center gap-1">
                  <span>🎲</span>
                  Sorteo: {new Date(entry.raffles.draw_date).toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
        {entries.length > 5 && (
          <button className="w-full py-2 text-sm text-[color:var(--accent)] hover:underline font-medium">
            Ver todas mis participaciones ({entries.length})
          </button>
        )}
      </div>
    </div>
  );
}