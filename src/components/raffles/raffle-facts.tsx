import { CalendarCheck2, CalendarClock, CalendarX2, Hash, Repeat, Ticket, Trophy, Users } from 'lucide-react';
import { ENTRY_MODES, formatDateTime, formatPrice } from '../../lib/raffle/labels';

type Facts = {
  entry_mode: string;
  ticket_price: number | null;
  total_winners: number;
  max_entries_per_user: number | null;
  start_date: string | null;
  end_date: string | null;
  draw_date: string | null;
  entries_count?: number;
};

/** Ficha con las condiciones clave del sorteo, igual en la página pública y en la del participante */
export function RaffleFacts({ raffle }: { raffle: Facts }) {
  const items = [
    {
      icon: Ticket,
      label: raffle.entry_mode === 'subscribers_only' ? 'Participación' : 'Precio por boleto',
      value: raffle.entry_mode === 'subscribers_only' ? 'Incluida en tu plan' : formatPrice(raffle.ticket_price),
    },
    { icon: Repeat, label: 'Modalidad', value: ENTRY_MODES[raffle.entry_mode]?.label ?? raffle.entry_mode },
    { icon: Trophy, label: 'Ganadores', value: String(raffle.total_winners) },
    {
      icon: Hash,
      label: 'Máximo por persona',
      value: raffle.max_entries_per_user ? `${raffle.max_entries_per_user} participaciones` : 'Sin límite',
    },
    { icon: CalendarCheck2, label: 'Abre', value: formatDateTime(raffle.start_date) },
    { icon: CalendarX2, label: 'Cierra la participación', value: formatDateTime(raffle.end_date) },
    { icon: CalendarClock, label: 'Fecha del sorteo', value: formatDateTime(raffle.draw_date) },
    ...(typeof raffle.entries_count === 'number'
      ? [{ icon: Users, label: 'Boletos emitidos hasta ahora', value: String(raffle.entries_count) }]
      : []),
  ];

  return (
    <dl className="grid gap-px overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-3 bg-[color:var(--card)] p-4">
          <item.icon className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)]" aria-hidden />
          <div>
            <dt className="text-xs text-[color:var(--muted-foreground)]">{item.label}</dt>
            <dd className="font-semibold text-[color:var(--foreground)]">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
