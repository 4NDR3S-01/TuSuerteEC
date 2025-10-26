'use client';

import { useState } from 'react';
import Link from 'next/link';

type Raffle = {
  id: string;
  title: string;
  description: string;
  prize_description: string;
  draw_date: string;
  entry_mode: string;
  max_entries_per_user: number | null;
  status: string;
  image_url?: string;
};

type RafflesPageProps = {
  readonly raffles: Raffle[];
};

// Helper para traducir el modo de entrada
const getEntryModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    'subscribers_only': 'Solo Suscriptores',
    'tickets_only': 'Solo Boletos',
    'hybrid': 'Híbrido'
  };
  return labels[mode] || mode;
};

export function RafflesPage({ raffles }: RafflesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'ending-soon'>('all');

  // Filter raffles
  const filteredRaffles = raffles.filter(raffle => {
    const matchesSearch = raffle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         raffle.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const drawDate = new Date(raffle.draw_date);
    const now = new Date();
    const daysUntil = Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (filterStatus === 'ending-soon') return daysUntil <= 3;
    if (filterStatus === 'upcoming') return daysUntil > 3;
    return true;
  });

  const stats = {
    total: raffles.length,
    endingSoon: raffles.filter(r => {
      const daysUntil = Math.ceil((new Date(r.draw_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3;
    }).length,
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Volver al Dashboard</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[color:var(--foreground)]">🎲 Sorteos Disponibles</h1>
            <p className="text-[color:var(--muted-foreground)] mt-1">Explora todos los sorteos activos y participa</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Total de Sorteos</div>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.total}</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-xl">
            <div className="text-sm text-orange-600 dark:text-orange-400 font-semibold">Por Terminar</div>
            <div className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1">{stats.endingSoon}</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-[color:var(--accent)]/10 to-purple-600/5 border border-[color:var(--accent)]/30 rounded-xl">
            <div className="text-sm text-[color:var(--accent)] font-semibold">Participaciones posibles</div>
            <div className="text-3xl font-black text-[color:var(--accent)] mt-1">∞</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar sorteos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-[color:var(--background)] border-2 border-[color:var(--border)] rounded-xl focus:border-[color:var(--accent)] transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'ending-soon', label: 'Por Terminar' },
              { value: 'upcoming', label: 'Próximos' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterStatus === filter.value
                    ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white'
                    : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/70'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Raffles Grid */}
        {filteredRaffles.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[color:var(--border)] rounded-2xl">
            <span className="text-6xl block mb-4">🎲</span>
            <h3 className="text-xl font-bold mb-2">No se encontraron sorteos</h3>
            <p className="text-[color:var(--muted-foreground)]">Intenta con otros filtros de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaffles.map((raffle) => {
              const drawDate = new Date(raffle.draw_date);
              const daysUntil = Math.ceil((drawDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isEndingSoon = daysUntil <= 3;

              return (
                <Link
                  key={raffle.id}
                  href={`/app/sorteos/${raffle.id}`}
                  className="group relative overflow-hidden border-2 border-[color:var(--border)] rounded-2xl hover:border-[color:var(--accent)] transition-all hover:shadow-xl"
                >
                  {/* Image */}
                  <div className="aspect-video bg-gradient-to-br from-[color:var(--accent)] to-orange-500 relative overflow-hidden">
                    {raffle.image_url ? (
                      <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl">🎁</span>
                      </div>
                    )}
                    {isEndingSoon && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        ⏰ {daysUntil}d restantes
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-3">
                    <h3 className="text-xl font-bold text-[color:var(--foreground)] line-clamp-2 group-hover:text-[color:var(--accent)] transition-colors">
                      {raffle.title}
                    </h3>
                    <p className="text-sm text-[color:var(--muted-foreground)] line-clamp-2">
                      {raffle.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-[color:var(--border)]">
                      <div>
                        <div className="text-xs text-[color:var(--muted-foreground)]">Premio</div>
                        <div className="font-bold text-[color:var(--accent)] line-clamp-1">{raffle.prize_description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[color:var(--muted-foreground)]">Modo</div>
                        <div className="font-bold text-[color:var(--foreground)] text-xs">{getEntryModeLabel(raffle.entry_mode)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
                      <span>📅 {drawDate.toLocaleDateString('es-EC')}</span>
                      <span>🎟️ {raffle.max_entries_per_user || '∞'} por usuario</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
