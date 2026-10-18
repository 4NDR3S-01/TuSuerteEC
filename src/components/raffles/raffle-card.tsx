import Link from 'next/link';
import { CalendarClock, Ticket, Trophy, Users } from 'lucide-react';
import { Badge } from '../ui/kit';
import { ENTRY_MODES, RAFFLE_STATUS, formatDate, formatPrice, prizeCategory } from '../../lib/raffle/labels';

export type RaffleCardData = {
  id: string;
  title: string;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  status: string;
  entry_mode: string;
  ticket_price: number | null;
  total_winners: number;
  end_date: string | null;
  draw_date: string | null;
  is_trending?: boolean;
  entries_count?: number;
};

function closingLabel(endDate: string | null) {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Participación cerrada';
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `Cierra en ${days} día${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(diff / 3_600_000));
  return `Cierra en ${hours} h`;
}

/** Tarjeta de sorteo reutilizable (portada, listado público y área de participante) */
export function RaffleCard({ raffle, href, footer }: { raffle: RaffleCardData; href: string; footer?: React.ReactNode }) {
  const category = prizeCategory(raffle.prize_category);
  const CategoryIcon = category.icon;
  const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.active;
  const closing = raffle.status === 'active' ? closingLabel(raffle.end_date) : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[color:var(--muted)]">
        {raffle.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={raffle.image_url}
            alt={`Premio: ${raffle.prize_description}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center" style={{ background: 'var(--hero-gradient)' }}>
            <CategoryIcon className="size-16 text-white/80" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge tone={status.tone} className="bg-[color:var(--card)]/95 shadow-sm backdrop-blur">{status.label}</Badge>
          {raffle.is_trending && raffle.status === 'active' && <Badge tone="accent" className="bg-[color:var(--card)]/95 shadow-sm backdrop-blur">Destacado</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <CategoryIcon className="size-3.5" aria-hidden />
            {category.label}
          </p>
          <h3 className="text-lg font-bold leading-snug text-[color:var(--foreground)]">
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {raffle.title}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm text-[color:var(--muted-foreground)]">{raffle.prize_description}</p>
        </div>

        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-[color:var(--border)] pt-4 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
              <Ticket className="size-3.5" aria-hidden /> {raffle.entry_mode === 'subscribers_only' ? 'Participación' : 'Boleto'}
            </dt>
            <dd className="font-bold text-[color:var(--foreground)]">
              {raffle.entry_mode === 'subscribers_only' ? 'Con tu plan' : formatPrice(raffle.ticket_price)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
              <CalendarClock className="size-3.5" aria-hidden /> Sorteo
            </dt>
            <dd className="font-bold text-[color:var(--foreground)]">{formatDate(raffle.draw_date)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
              <Trophy className="size-3.5" aria-hidden /> Ganadores
            </dt>
            <dd className="font-bold text-[color:var(--foreground)]">{raffle.total_winners}</dd>
          </div>
          {typeof raffle.entries_count === 'number' && (
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
                <Users className="size-3.5" aria-hidden /> Boletos emitidos
              </dt>
              <dd className="font-bold tabular-nums text-[color:var(--foreground)]">{raffle.entries_count}</dd>
            </div>
          )}
        </dl>

        <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
          <span className="text-[color:var(--muted-foreground)]">{ENTRY_MODES[raffle.entry_mode]?.label}</span>
          {closing && <span className="font-semibold text-[color:var(--foreground)]">{closing}</span>}
        </div>
        {footer && <div className="relative z-10">{footer}</div>}
      </div>
    </article>
  );
}
