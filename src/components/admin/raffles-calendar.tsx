'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Flag, Rocket, Trophy, type LucideIcon } from 'lucide-react';
import { RAFFLE_STATUS } from '../../lib/raffle/labels';
import { Badge, Button, Card, EmptyState, SectionHeader, inputStyles } from '../ui/kit';
import { cn } from '../../lib/utils';

type Raffle = { id: string; title: string; status: string; start_date: string | null; end_date: string | null; draw_date: string | null };

type CalendarEvent = { raffle: Raffle; kind: 'start' | 'end' | 'draw'; date: Date };

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const KINDS: Record<CalendarEvent['kind'], { label: string; icon: LucideIcon; className: string }> = {
  start: { label: 'Abre', icon: Rocket, className: 'text-[color:var(--success)]' },
  end: { label: 'Cierra', icon: Flag, className: 'text-[color:var(--warning)]' },
  draw: { label: 'Sorteo', icon: Trophy, className: 'text-[color:var(--accent)]' },
};

// Fechas de Ecuador continental (UTC-5) para que el día no cambie según la zona del navegador
function ecuadorDay(value: string) {
  const date = new Date(new Date(value).getTime() - 5 * 3_600_000);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Calendario de aperturas, cierres y sorteos. En móvil se muestra como agenda. */
export function RafflesCalendar({ raffles }: { raffles: Raffle[] }) {
  const today = ecuadorDay(new Date().toISOString());
  const [cursor, setCursor] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const [statusFilter, setStatusFilter] = useState('all');

  const events = useMemo(() => {
    const list: CalendarEvent[] = [];
    for (const raffle of raffles) {
      if (statusFilter !== 'all' && raffle.status !== statusFilter) continue;
      if (raffle.start_date) list.push({ raffle, kind: 'start', date: ecuadorDay(raffle.start_date) });
      if (raffle.end_date) list.push({ raffle, kind: 'end', date: ecuadorDay(raffle.end_date) });
      if (raffle.draw_date) list.push({ raffle, kind: 'draw', date: ecuadorDay(raffle.draw_date) });
    }
    return list;
  }, [raffles, statusFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(event.date);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // lunes primero
  const cells = Array.from({ length: Math.ceil((leading + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= daysInMonth ? new Date(Date.UTC(cursor.year, cursor.month, day)) : null;
  });
  const monthEvents = events
    .filter((event) => event.date.getUTCFullYear() === cursor.year && event.date.getUTCMonth() === cursor.month)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const move = (delta: number) =>
    setCursor((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });

  return (
    <div className="space-y-6">
      <SectionHeader as="h1" title="Calendario de sorteos" description="Aperturas, cierres y fechas de sorteo (hora de Ecuador)." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => move(-1)} aria-label="Mes anterior"><ChevronLeft aria-hidden /></Button>
          <p className="min-w-40 text-center text-lg font-bold" aria-live="polite">{MONTHS[cursor.month]} {cursor.year}</p>
          <Button variant="secondary" size="icon" onClick={() => move(1)} aria-label="Mes siguiente"><ChevronRight aria-hidden /></Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor({ year: today.getUTCFullYear(), month: today.getUTCMonth() })}>Hoy</Button>
        </div>
        <select aria-label="Filtrar por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputStyles} sm:w-56`}>
          <option value="all">Todos los estados</option>
          {Object.entries(RAFFLE_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[color:var(--muted-foreground)]">
        {Object.values(KINDS).map((kind) => (
          <span key={kind.label} className="inline-flex items-center gap-1.5"><kind.icon className={cn('size-3.5', kind.className)} aria-hidden /> {kind.label}</span>
        ))}
      </div>

      {/* Escritorio: cuadrícula mensual */}
      <Card className="hidden overflow-hidden md:block">
        <div className="grid grid-cols-7 border-b border-[color:var(--border)] bg-[color:var(--muted)]/60">
          {DAYS.map((day) => <div key={day} className="p-2 text-center text-xs font-semibold uppercase text-[color:var(--muted-foreground)]">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, index) => {
            const dayEvents = date ? byDay.get(dayKey(date)) ?? [] : [];
            const isToday = date && dayKey(date) === dayKey(today);
            return (
              <div key={index} className={cn('min-h-28 border-b border-r border-[color:var(--border)] p-1.5 [&:nth-child(7n)]:border-r-0', !date && 'bg-[color:var(--muted)]/30')}>
                {date && (
                  <>
                    <p className={cn('mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]' : 'text-[color:var(--muted-foreground)]')}>
                      {date.getUTCDate()}
                    </p>
                    <ul className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const kind = KINDS[event.kind];
                        return (
                          <li key={`${event.raffle.id}-${event.kind}`}>
                            <Link href="/administrador/sorteos" title={`${kind.label}: ${event.raffle.title}`} className="flex items-center gap-1 rounded-md bg-[color:var(--muted)] px-1.5 py-1 text-[11px] font-medium hover:bg-[color:var(--accent-soft)]">
                              <kind.icon className={cn('size-3 shrink-0', kind.className)} aria-label={kind.label} />
                              <span className="truncate">{event.raffle.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                      {dayEvents.length > 3 && <li className="px-1 text-[11px] text-[color:var(--muted-foreground)]">+{dayEvents.length - 3} más</li>}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Móvil: agenda del mes */}
      <div className="md:hidden">
        {monthEvents.length === 0 ? (
          <EmptyState icon={Trophy} title="Sin eventos este mes" />
        ) : (
          <Card className="divide-y divide-[color:var(--border)]">
            {monthEvents.map((event) => {
              const kind = KINDS[event.kind];
              const status = RAFFLE_STATUS[event.raffle.status];
              return (
                <Link key={`${event.raffle.id}-${event.kind}`} href="/administrador/sorteos" className="flex items-center gap-3 p-4">
                  <span className="w-10 shrink-0 text-center">
                    <span className="block text-lg font-extrabold leading-none">{event.date.getUTCDate()}</span>
                    <span className="text-[11px] uppercase text-[color:var(--muted-foreground)]">{DAYS[(event.date.getUTCDay() + 6) % 7]}</span>
                  </span>
                  <kind.icon className={cn('size-5 shrink-0', kind.className)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{event.raffle.title}</span>
                    <span className="text-xs text-[color:var(--muted-foreground)]">{kind.label}</span>
                  </span>
                  {status && <Badge tone={status.tone}>{status.label}</Badge>}
                </Link>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
