'use client';

import { useState } from 'react';
import Link from 'next/link';

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_category: string | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  status: 'draft' | 'active' | 'closed' | 'drawn' | 'completed';
  entry_mode: 'subscribers_only' | 'tickets_only' | 'hybrid';
  total_winners: number;
};

type RafflesCalendarProps = {
  raffles: Raffle[];
};

const STATUS_COLORS = {
  draft: 'bg-gray-500/20 border-gray-500 text-gray-700 dark:text-gray-300',
  active: 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300',
  closed: 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300',
  drawn: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300',
  completed: 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300',
};

const CATEGORY_ICONS = {
  electronics: '📱',
  vehicles: '🚗',
  travel: '✈️',
  cash: '💵',
  home: '🏠',
  entertainment: '🎮',
  sports: '⚽',
  other: '🎁',
};

const CATEGORY_LABELS = {
  electronics: 'Electrónicos',
  vehicles: 'Vehículos',
  travel: 'Viajes',
  cash: 'Efectivo',
  home: 'Hogar',
  entertainment: 'Entretenimiento',
  sports: 'Deportes',
  other: 'Otros',
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function RafflesCalendar({ raffles }: Readonly<RafflesCalendarProps>) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Obtener el primer y último día del mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Días del mes anterior para rellenar
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from(
    { length: firstDayWeekday },
    (_, i) => daysInPrevMonth - firstDayWeekday + i + 1
  );

  // Días del mes actual
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Días del mes siguiente para completar la cuadrícula (6 semanas = 42 días)
  const totalDays = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = Array.from({ length: 42 - totalDays }, (_, i) => i + 1);

  // Filtrar sorteos por mes actual y categoría
  const rafflesInMonth = raffles.filter((raffle) => {
    const startDate = new Date(raffle.start_date);
    const endDate = new Date(raffle.end_date);
    const drawDate = new Date(raffle.draw_date);
    
    const isInMonth = 
      (startDate.getFullYear() === year && startDate.getMonth() === month) ||
      (endDate.getFullYear() === year && endDate.getMonth() === month) ||
      (drawDate.getFullYear() === year && drawDate.getMonth() === month) ||
      (startDate <= lastDayOfMonth && endDate >= firstDayOfMonth);

    const matchesCategory = categoryFilter === 'all' || raffle.prize_category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || raffle.status === statusFilter;
    
    return isInMonth && matchesCategory && matchesStatus;
  });

  // Obtener sorteos por día
  const getRafflesForDay = (day: number) => {
    const date = new Date(year, month, day);
    return rafflesInMonth.filter((raffle) => {
      const startDate = new Date(raffle.start_date);
      const endDate = new Date(raffle.end_date);
      const drawDate = new Date(raffle.draw_date);
      
      return (
        (startDate.toDateString() === date.toDateString()) ||
        (endDate.toDateString() === date.toDateString()) ||
        (drawDate.toDateString() === date.toDateString())
      );
    });
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/administrador/sorteos"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
            >
              ← Volver a sorteos
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--foreground)]">Calendario de Sorteos</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {rafflesInMonth.length} sorteos en {MONTHS[month]} {year}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              viewMode === 'month'
                ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
                : 'border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/40'
            }`}
          >
            📅 Mes
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
                : 'border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/40'
            }`}
          >
            📋 Lista
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="text-2xl font-bold text-[color:var(--foreground)]">
            {raffles.filter(r => r.status === 'draft').length}
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">Borradores</div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {raffles.filter(r => r.status === 'active').length}
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">Activos</div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {raffles.filter(r => r.status === 'closed').length}
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">Cerrados</div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {raffles.filter(r => r.status === 'drawn').length}
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">Sorteados</div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {raffles.filter(r => r.status === 'completed').length}
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">Completados</div>
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
            title="Mes anterior"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
          >
            Hoy
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
            title="Mes siguiente"
          >
            →
          </button>
          <span className="ml-4 text-lg font-bold text-[color:var(--foreground)]">
            {MONTHS[month]} {year}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[color:var(--muted-foreground)]">Categoría:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
          >
            <option value="all">Todas</option>
            <option value="electronics">📱 Electrónicos</option>
            <option value="vehicles">🚗 Vehículos</option>
            <option value="travel">✈️ Viajes</option>
            <option value="cash">💵 Efectivo</option>
            <option value="home">🏠 Hogar</option>
            <option value="entertainment">🎮 Entretenimiento</option>
            <option value="sports">⚽ Deportes</option>
            <option value="other">🎁 Otros</option>
          </select>
          
          <span className="ml-2 text-sm text-[color:var(--muted-foreground)]">Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
          >
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="closed">Cerrado</option>
            <option value="drawn">Sorteado</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </div>

      {/* Vista Mes */}
      {viewMode === 'month' && (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
          {/* Cabecera de días */}
          <div className="grid grid-cols-7 border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
            {DAYS.map((day) => (
              <div
                key={day}
                className="border-r border-[color:var(--border)] p-2 text-center text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Cuadrícula del calendario */}
          <div className="grid grid-cols-7">
            {/* Días del mes anterior */}
            {prevMonthDays.map((day) => (
              <div
                key={`prev-${day}`}
                className="min-h-[100px] border-b border-r border-[color:var(--border)] bg-[color:var(--muted)]/20 p-2 last:border-r-0"
              >
                <span className="text-xs text-[color:var(--muted-foreground)]">{day}</span>
              </div>
            ))}

            {/* Días del mes actual */}
            {currentMonthDays.map((day) => {
              const dayRaffles = getRafflesForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`current-${day}`}
                  className={`min-h-[100px] border-b border-r border-[color:var(--border)] p-2 transition-colors hover:bg-[color:var(--muted)]/20 last:border-r-0 ${
                    isToday ? 'bg-[color:var(--accent)]/5' : ''
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
                          : 'text-[color:var(--foreground)]'
                      }`}
                    >
                      {day}
                    </span>
                    {dayRaffles.length > 0 && (
                      <span className="rounded-full bg-[color:var(--accent)]/20 px-2 py-0.5 text-xs font-semibold text-[color:var(--accent)]">
                        {dayRaffles.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayRaffles.slice(0, 3).map((raffle) => {
                      const raffleStartDate = new Date(raffle.start_date);
                      const raffleEndDate = new Date(raffle.end_date);
                      const raffleDrawDate = new Date(raffle.draw_date);
                      const currentDayDate = new Date(year, month, day);
                      
                      let eventType = '';
                      if (raffleStartDate.toDateString() === currentDayDate.toDateString()) {
                        eventType = '🚀 ';
                      } else if (raffleEndDate.toDateString() === currentDayDate.toDateString()) {
                        eventType = '🏁 ';
                      } else if (raffleDrawDate.toDateString() === currentDayDate.toDateString()) {
                        eventType = '🎯 ';
                      }
                      
                      return (
                        <Link
                          key={raffle.id}
                          href={`/administrador/sorteos`}
                          className={`block rounded border-l-2 p-1 text-xs transition-colors hover:bg-[color:var(--background)] ${
                            STATUS_COLORS[raffle.status]
                          }`}
                          title={`${raffle.title} - ${raffle.prize_description}`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="flex-shrink-0">{eventType}{CATEGORY_ICONS[raffle.prize_category as keyof typeof CATEGORY_ICONS] || '🎁'}</span>
                            <span className="truncate font-semibold">{raffle.title}</span>
                          </div>
                        </Link>
                      );
                    })}
                    {dayRaffles.length > 3 && (
                      <Link
                        href={`/administrador/sorteos`}
                        className="block w-full text-left text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                      >
                        +{dayRaffles.length - 3} más
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Días del mes siguiente */}
            {nextMonthDays.map((day) => (
              <div
                key={`next-${day}`}
                className="min-h-[100px] border-b border-r border-[color:var(--border)] bg-[color:var(--muted)]/20 p-2 last:border-r-0"
              >
                <span className="text-xs text-[color:var(--muted-foreground)]">{day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista Lista */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {rafflesInMonth.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-12 text-center">
              <span className="text-4xl">📅</span>
              <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">
                No hay sorteos en este mes
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                {categoryFilter === 'all'
                  ? 'Los sorteos programados aparecerán aquí'
                  : 'Intenta cambiar el filtro de categoría'}
              </p>
            </div>
          ) : (
            [...rafflesInMonth]
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map((raffle) => (
                <div
                  key={raffle.id}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors hover:bg-[color:var(--muted)]/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl">
                        {CATEGORY_ICONS[raffle.prize_category as keyof typeof CATEGORY_ICONS] || '🎁'}
                      </span>
                      <span className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                        {CATEGORY_LABELS[raffle.prize_category as keyof typeof CATEGORY_LABELS] || 'Otros'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-[color:var(--foreground)]">{raffle.title}</h3>
                          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                            🎁 {raffle.prize_description}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            STATUS_COLORS[raffle.status]
                          }`}
                        >
                          {raffle.status === 'draft' && 'Borrador'}
                          {raffle.status === 'active' && 'Activo'}
                          {raffle.status === 'closed' && 'Cerrado'}
                          {raffle.status === 'drawn' && 'Sorteado'}
                          {raffle.status === 'completed' && 'Completado'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-[color:var(--muted-foreground)] sm:grid-cols-3">
                        <div>
                          <span className="font-semibold">📅 Inicio:</span>{' '}
                          {new Date(raffle.start_date).toLocaleDateString('es-EC', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div>
                          <span className="font-semibold">🏁 Fin:</span>{' '}
                          {new Date(raffle.end_date).toLocaleDateString('es-EC', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div>
                          <span className="font-semibold">🎯 Sorteo:</span>{' '}
                          {new Date(raffle.draw_date).toLocaleDateString('es-EC', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">Estados de Sorteos</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-500"></div>
              <span className="text-xs text-[color:var(--muted-foreground)]">Borrador</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-[color:var(--muted-foreground)]">Activo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span className="text-xs text-[color:var(--muted-foreground)]">Cerrado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-[color:var(--muted-foreground)]">Sorteado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-[color:var(--muted-foreground)]">Completado</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">Tipos de Evento</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <span className="text-xs text-[color:var(--muted-foreground)]">Inicio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏁</span>
              <span className="text-xs text-[color:var(--muted-foreground)]">Fin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-xs text-[color:var(--muted-foreground)]">Sorteo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
