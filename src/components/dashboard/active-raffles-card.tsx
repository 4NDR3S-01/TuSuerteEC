'use client';

import Link from 'next/link';

interface Raffle {
  id: string;
  title: string;
  draw_date: string;
  prize_description: string;
  ticket_price: number;
  total_tickets: number;
  status: string;
}

interface ActiveRafflesCardProps {
  readonly raffles: Raffle[];
}

export function ActiveRafflesCard({ raffles }: ActiveRafflesCardProps) {
  if (!raffles || raffles.length === 0) {
    return (
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Próximos Sorteos</h2>
          <span className="text-2xl">🎁</span>
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-3">⏰</div>
          <p className="text-[color:var(--muted-foreground)] text-sm">No hay sorteos activos en este momento</p>
          <p className="text-xs text-[color:var(--muted-foreground)] mt-2">¡Vuelve pronto para nuevas oportunidades!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Próximos Sorteos</h2>
        <span className="text-2xl">🎁</span>
      </div>
      <div className="space-y-4">
        {raffles.slice(0, 3).map((raffle) => {
          const drawDate = new Date(raffle.draw_date);
          const now = new Date();
          const daysUntilDraw = Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <Link
              key={raffle.id}
              href={`/sorteos/${raffle.id}`}
              className="block p-4 bg-gradient-to-br from-[color:var(--muted)] to-[color:var(--muted)]/50 rounded-lg border border-[color:var(--border)] hover:border-[color:var(--accent)] transition-all hover:shadow-lg group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors truncate">
                    {raffle.title}
                  </h3>
                  <p className="text-sm text-[color:var(--muted-foreground)] mt-1 line-clamp-2">
                    {raffle.prize_description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                      <span>📅</span>
                      <span>{drawDate.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                      <span>💰</span>
                      <span>${raffle.ticket_price}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    daysUntilDraw <= 3 
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {daysUntilDraw <= 0 ? 'Hoy' : `${daysUntilDraw}d`}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {raffles.length > 3 && (
          <Link
            href="/sorteos"
            className="block w-full py-2 text-center text-sm text-[color:var(--accent)] hover:underline font-medium"
          >
            Ver todos los sorteos ({raffles.length})
          </Link>
        )}
      </div>
    </div>
  );
}