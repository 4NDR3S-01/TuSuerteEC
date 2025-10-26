'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Raffle {
  readonly id: string;
  readonly title: string;
  readonly prize_description: string;
  readonly prize_category: string | null;
  readonly image_url: string | null;
  readonly draw_date: string;
  readonly status: string;
}

interface Entry {
  readonly id: string;
  readonly ticket_number: string;
  readonly created_at: string;
  readonly is_winner: boolean;
  readonly entry_source: string;
  readonly raffles: Raffle | Raffle[]; // Can be array or object from Supabase join
}

interface MyTicketsPageProps {
  entries: Entry[];
}

export function MyTicketsPage({ entries }: MyTicketsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'winner'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'draw_date'>('recent');

  // Normalize raffle data (can be array or object from Supabase join)
  const getRaffle = (entry: Entry): Raffle => {
    return Array.isArray(entry.raffles) ? entry.raffles[0] : entry.raffles;
  };

  // Filtrar y ordenar entries
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filtro de búsqueda
    if (searchQuery) {
      result = result.filter(entry => {
        const raffle = getRaffle(entry);
        return raffle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.ticket_number.includes(searchQuery);
      });
    }

    // Filtro de estado
    if (statusFilter !== 'all') {
      result = result.filter(entry => {
        if (statusFilter === 'winner') return entry.is_winner;
        const raffle = getRaffle(entry);
        if (statusFilter === 'active') return raffle.status === 'active';
        if (statusFilter === 'completed') return ['completed', 'drawn'].includes(raffle.status);
        return true;
      });
    }

    // Ordenar
    result = [...result].sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'draw_date') {
        const raffleA = getRaffle(a);
        const raffleB = getRaffle(b);
        return new Date(raffleA.draw_date).getTime() - new Date(raffleB.draw_date).getTime();
      }
      return 0;
    });

    return result;
  }, [entries, searchQuery, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: entries.length,
    winners: entries.filter(e => e.is_winner).length,
    active: entries.filter(e => {
      const raffle = getRaffle(e);
      return raffle.status === 'active';
    }).length,
    completed: entries.filter(e => {
      const raffle = getRaffle(e);
      return ['completed', 'drawn'].includes(raffle.status);
    }).length,
  }), [entries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)]/10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[color:var(--foreground)] flex items-center gap-3">
                <span className="text-4xl">🎫</span>
                <span>Mis Boletos</span>
              </h1>
              <p className="text-[color:var(--muted-foreground)] mt-2">
                Gestiona todas tus participaciones en sorteos
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📊</span>
              <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                Total
              </span>
            </div>
            <div className="text-3xl font-black text-[color:var(--foreground)]">{stats.total}</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Participaciones</div>
          </div>

          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏆</span>
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full">
                Ganados
              </span>
            </div>
            <div className="text-3xl font-black text-[color:var(--foreground)]">{stats.winners}</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Premios</div>
          </div>

          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🎯</span>
              <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full">
                Activos
              </span>
            </div>
            <div className="text-3xl font-black text-[color:var(--foreground)]">{stats.active}</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-1">En curso</div>
          </div>

          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">✅</span>
              <span className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">
                Finalizados
              </span>
            </div>
            <div className="text-3xl font-black text-[color:var(--foreground)]">{stats.completed}</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Completados</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-2 block">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Título o # de boleto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-2 block">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="completed">Completados</option>
                <option value="winner">Ganadores</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-2 block">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="draw_date">Fecha de sorteo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        {filteredEntries.length === 0 ? (
          <div className="bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-12 text-center">
            <span className="text-6xl block mb-4">🎯</span>
            <h3 className="text-lg font-bold text-[color:var(--foreground)] mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No se encontraron boletos' : 'Sin Participaciones'}
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-sm mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no has participado en ningún sorteo'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/app/sorteos"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <span>🎁</span>
                <span>Ver Sorteos Activos</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const raffle = getRaffle(entry);
              const drawDate = new Date(raffle.draw_date);
              const isPending = drawDate > new Date();
              const isWinner = entry.is_winner;

              return (
                <div
                  key={entry.id}
                  className={`group bg-[color:var(--card)] border-2 rounded-2xl p-6 hover:shadow-xl transition-all ${
                    isWinner
                      ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-transparent'
                      : 'border-[color:var(--border)] hover:border-[color:var(--accent)]/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Ticket Number Badge */}
                    <div className={`flex-shrink-0 w-32 h-32 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-lg ${
                      isWinner
                        ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500'
                        : 'bg-gradient-to-br from-[color:var(--accent)] to-orange-500'
                    }`}>
                      <span className="text-xs opacity-75">BOLETO</span>
                      <span className="text-3xl leading-none">#{entry.ticket_number}</span>
                      {isWinner && (
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          <span className="text-2xl">🏆</span>
                        </div>
                      )}
                    </div>

                    {/* Ticket Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-2 ${isWinner ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'}`}>
                            {raffle.title}
                          </h3>
                          <p className="text-sm text-[color:var(--muted-foreground)] mb-3">
                            🏆 {raffle.prize_description}
                          </p>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex flex-col gap-2">
                          {isPending && (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full whitespace-nowrap">
                              PENDIENTE
                            </span>
                          )}
                          {isWinner && (
                            <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full whitespace-nowrap animate-pulse">
                              GANADOR
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[color:var(--border)]">
                        <div>
                          <p className="text-xs text-[color:var(--muted-foreground)] mb-1">Fecha de Registro</p>
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {new Date(entry.created_at).toLocaleDateString('es-EC', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[color:var(--muted-foreground)] mb-1">Fecha de Sorteo</p>
                          <p className={`text-sm font-semibold ${isWinner ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'}`}>
                            {drawDate.toLocaleDateString('es-EC', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[color:var(--muted-foreground)] mb-1">Origen</p>
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {entry.entry_source === 'subscription' ? '💳 Suscripción' : '🎫 Compra'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[color:var(--muted-foreground)] mb-1">Estado</p>
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {raffle.status === 'active' && '🎯 Activo'}
                            {raffle.status === 'completed' && '✅ Completado'}
                            {raffle.status === 'drawn' && '🎲 Sorteado'}
                            {raffle.status === 'draft' && '📝 Borrador'}
                          </p>
                        </div>
                      </div>

                      {/* Winner Message */}
                      {isWinner && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold text-sm">
                            <span className="animate-pulse">✨</span>
                            <span>¡Felicidades! Has ganado este sorteo</span>
                            <span className="animate-pulse">✨</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results Counter */}
        {filteredEntries.length > 0 && (
          <div className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
            Mostrando {filteredEntries.length} de {entries.length} participaciones
          </div>
        )}
      </div>
    </div>
  );
}
