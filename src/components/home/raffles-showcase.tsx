import type { ReactNode } from "react";
import Link from "next/link";

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  status: string;
  entry_mode: 'subscribers_only' | 'tickets_only' | 'hybrid';
  is_trending: boolean;
};

type PrizesShowcaseProps = {
  kicker: ReactNode;
  title: ReactNode;
  description: ReactNode;
  raffles?: Raffle[];
};

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📱',
  vehicles: '🚗',
  travel: '✈️',
  cash: '💵',
  home: '🏠',
  entertainment: '🎮',
  sports: '⚽',
  other: '🎁',
};

const ENTRY_MODE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  subscribers_only: {
    label: 'Solo Suscriptores',
    color: 'bg-red-500',
    icon: '👥'
  },
  tickets_only: {
    label: 'Compra de Boletos',
    color: 'bg-green-500',
    icon: '🎫'
  },
  hybrid: {
    label: 'Suscriptores + Boletos',
    color: 'bg-purple-500',
    icon: '🎯'
  }
};

export function RafflesShowcase({
  kicker,
  title,
  description,
  raffles = [],
}: Readonly<PrizesShowcaseProps>) {
  const activeRaffles = raffles.filter(r => r.status === 'active').slice(0, 6);

  return (
    <section id="sorteos" className="scroll-mt-header space-y-8 sm:space-y-10">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          {kicker}
        </span>
        <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{title}</h2>
        <p className="max-w-3xl text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
      </div>

      {activeRaffles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeRaffles.map((raffle) => (
            <article
              key={raffle.id}
              className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] transition-all hover:shadow-xl hover:scale-[1.02]"
            >
              {/* Imagen del premio */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20">
                {raffle.image_url ? (
                  <img
                    src={raffle.image_url}
                    alt={raffle.prize_description}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-6xl opacity-50">
                      {CATEGORY_ICONS[raffle.prize_category || 'other'] || '🎁'}
                    </span>
                  </div>
                )}
                
                {/* Badge de modalidad */}
                <div className={`absolute right-3 top-3 rounded-full ${ENTRY_MODE_LABELS[raffle.entry_mode].color} px-3 py-1 text-xs font-bold text-white shadow-lg`}>
                  {ENTRY_MODE_LABELS[raffle.entry_mode].icon} {ENTRY_MODE_LABELS[raffle.entry_mode].label}
                </div>
                
                {/* Indicador de trending */}
                {raffle.is_trending && (
                  <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                    🔥 Tendencia
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="p-6 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-[color:var(--foreground)] line-clamp-1">
                    {raffle.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--accent)]">
                    🏆 {raffle.prize_description}
                  </p>
                </div>

                {raffle.description && (
                  <p className="text-xs text-[color:var(--muted-foreground)] line-clamp-2">
                    {raffle.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 text-xs text-[color:var(--muted-foreground)]">
                  <div>
                    <p>Finaliza:</p>
                    <p className="font-semibold text-[color:var(--foreground)]">
                      {new Date(raffle.end_date).toLocaleDateString('es-EC', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p>Sorteo:</p>
                    <p className="font-semibold text-[color:var(--foreground)]">
                      {new Date(raffle.draw_date).toLocaleDateString('es-EC', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <Link
                  href="/iniciar-sesion"
                  className="mt-4 block w-full rounded-lg bg-[color:var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:bg-[color:var(--accent)]/90"
                >
                  Participar ahora
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/20 p-12 text-center">
          <span className="mb-3 text-5xl opacity-50">🎲</span>
          <p className="text-lg font-semibold text-[color:var(--foreground)]">
            No hay sorteos activos en este momento
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Mantente atento a nuestras redes sociales para conocer los próximos sorteos
          </p>
        </div>
      )}
    </section>
  );
}
