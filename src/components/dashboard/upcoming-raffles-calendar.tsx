'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

interface Raffle {
  id: string;
  title: string;
  draw_date: string;
  prize_description: string;
}

interface UpcomingRafflesCalendarProps {
  readonly raffles: Raffle[];
}

export function UpcomingRafflesCalendar({ raffles }: UpcomingRafflesCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Generar los próximos 14 días
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    
    return days;
  }, []);

  // Agrupar sorteos por día
  const rafflesByDate = useMemo(() => {
    const grouped = new Map<string, Raffle[]>();
    
    for (const raffle of raffles) {
      const date = new Date(raffle.draw_date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(raffle);
    }
    
    return grouped;
  }, [raffles]);

  const getDayInfo = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { label: 'Hoy', color: 'bg-gradient-to-br from-red-500 to-orange-500', textColor: 'text-white', isUrgent: true };
    if (diffDays === 1) return { label: 'Mañana', color: 'bg-gradient-to-br from-orange-500 to-amber-500', textColor: 'text-white', isUrgent: true };
    if (diffDays <= 3) return { label: `${diffDays}d`, color: 'bg-amber-500/20 border-amber-500/50', textColor: 'text-amber-700 dark:text-amber-400', isUrgent: false };
    return { label: `${diffDays}d`, color: 'bg-[color:var(--muted)]', textColor: 'text-[color:var(--muted-foreground)]', isUrgent: false };
  };

  const getDayRaffles = (date: Date): Raffle[] => {
    const dateKey = date.toISOString().split('T')[0];
    return rafflesByDate.get(dateKey) || [];
  };

  if (!raffles || raffles.length === 0) {
    return (
      <div className="bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
          Sin Sorteos Programados
        </h3>
        <p className="text-[color:var(--muted-foreground)] text-sm">
          No hay sorteos próximos en el calendario
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 border-b border-[color:var(--border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span>Calendario de Sorteos</span>
          </h2>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
            Próximas 2 semanas
          </span>
        </div>
      </div>

      {/* Calendar Grid - Vista Horizontal Scrollable */}
      <div className="p-6">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[color:var(--accent)] scrollbar-track-[color:var(--muted)]">
          {calendarDays.map((date) => {
            const dayRaffles = getDayRaffles(date);
            const dayInfo = getDayInfo(date);
            const hasRaffles = dayRaffles.length > 0;
            const dateKey = date.toISOString().split('T')[0];
            const isSelected = selectedDate === dateKey;
            
            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                className={`flex-shrink-0 relative group transition-all duration-300 ${
                  isSelected ? 'scale-105 z-10' : 'hover:scale-105'
                }`}
              >
                <div className={`w-24 rounded-xl border-2 transition-all duration-300 ${
                  isSelected 
                    ? 'border-[color:var(--accent)] shadow-lg' 
                    : hasRaffles 
                      ? 'border-[color:var(--accent)]/30 hover:border-[color:var(--accent)]/60' 
                      : 'border-[color:var(--border)] hover:border-[color:var(--border)]'
                } ${dayInfo.color}`}>
                  
                  {/* Day Header */}
                  <div className={`p-3 text-center border-b ${
                    hasRaffles ? 'border-[color:var(--accent)]/20' : 'border-[color:var(--border)]'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${dayInfo.textColor} opacity-70`}>
                      {date.toLocaleDateString('es-EC', { weekday: 'short' })}
                    </div>
                    <div className={`text-2xl font-black leading-none mt-1 ${dayInfo.textColor}`}>
                      {date.getDate()}
                    </div>
                    {dayInfo.isUrgent && (
                      <div className="mt-1">
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-white/90 text-red-600 rounded-full animate-pulse">
                          {dayInfo.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Raffles Indicator */}
                  <div className="p-2 min-h-[60px] flex flex-col items-center justify-center">
                    {hasRaffles ? (
                      <>
                        <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">
                          🎁
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse"></span>
                          <span className="text-xs font-bold text-[color:var(--accent)]">
                            {dayRaffles.length}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse"></span>
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl opacity-20">
                        ·
                      </div>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[color:var(--accent)]"></div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details */}
        {selectedDate && rafflesByDate.has(selectedDate) && (
          <div className="mt-6 pt-6 border-t border-[color:var(--border)] animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🎯</span>
              <h3 className="font-bold text-[color:var(--foreground)]">
                Sorteos del {new Date(selectedDate).toLocaleDateString('es-EC', { 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="ml-auto text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
              >
                Cerrar ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {rafflesByDate.get(selectedDate)?.map((raffle) => (
                <Link
                  key={raffle.id}
                  href={`/app/sorteos/${raffle.id}`}
                  className="block p-4 bg-gradient-to-r from-[color:var(--muted)]/50 to-transparent border border-[color:var(--border)] hover:border-[color:var(--accent)]/50 rounded-xl transition-all duration-300 hover:shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[color:var(--accent)] to-orange-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      🎁
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors line-clamp-1">
                        {raffle.title}
                      </h4>
                      <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5 line-clamp-1">
                        🏆 {raffle.prize_description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-[color:var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-bold">→</span>
                    </div>
                  </div>
                </Link>
              )) || []}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <Link
          href="/app/sorteos"
          className="block w-full py-3 text-center text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 bg-[color:var(--muted)]/50 hover:bg-[color:var(--muted)] rounded-xl transition-all group"
        >
          <span className="inline-flex items-center gap-2">
            Ver todos los sorteos
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
