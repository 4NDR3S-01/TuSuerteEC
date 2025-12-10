'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Ticket, BarChart3, Trophy, Target, CheckCircle2, Gift, CreditCard, Dices, FileText, Sparkles, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(10);

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

  const displayedEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = filteredEntries.length > visibleCount;

  const toggleCard = (entryId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)]/10 dark:to-[color:var(--muted)]/5">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 dark:hover:text-orange-400 transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[color:var(--foreground)] flex items-center gap-2 sm:gap-3">
                <Ticket className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[color:var(--accent)] flex-shrink-0" />
                <span className="truncate">Mis Boletos</span>
              </h1>
              <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mt-1 sm:mt-2">
                Gestiona todas tus participaciones en sorteos
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-[color:var(--accent)]" />
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-bold rounded-full">
                Total
              </span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[color:var(--foreground)]">{stats.total}</div>
            <div className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-0.5 sm:mt-1">Participaciones</div>
          </div>

          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-500 dark:text-yellow-400" />
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] sm:text-xs font-bold rounded-full">
                Ganados
              </span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[color:var(--foreground)]">{stats.winners}</div>
            <div className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-0.5 sm:mt-1">Premios</div>
          </div>

          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-500 dark:text-green-400" />
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] sm:text-xs font-bold rounded-full">
                Activos
              </span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[color:var(--foreground)]">{stats.active}</div>
            <div className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-0.5 sm:mt-1">En curso</div>
          </div>

          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-500 dark:text-purple-400" />
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] sm:text-xs font-bold rounded-full">
                Finalizados
              </span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[color:var(--foreground)]">{stats.completed}</div>
            <div className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-0.5 sm:mt-1">Completados</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
          <div className="bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center">
            <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-[color:var(--muted-foreground)]" />
            <h3 className="text-base sm:text-lg font-bold text-[color:var(--foreground)] mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No se encontraron boletos' : 'Sin Participaciones'}
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-xs sm:text-sm mb-4 sm:mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no has participado en ningún sorteo'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/app/sorteos"
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Ver Sorteos Activos</span>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2 sm:space-y-3">
              {displayedEntries.map((entry) => {
                const raffle = getRaffle(entry);
                const drawDate = new Date(raffle.draw_date);
                const isPending = drawDate > new Date();
                const isWinner = entry.is_winner;
                const isExpanded = expandedCards.has(entry.id);

                return (
                  <div
                    key={entry.id}
                    className={`group bg-[color:var(--card)] border-2 rounded-lg sm:rounded-xl hover:shadow-lg transition-all ${
                      isWinner
                        ? 'border-yellow-500/30 dark:border-yellow-500/50 bg-gradient-to-r from-yellow-500/5 dark:from-yellow-500/10 via-orange-500/5 dark:via-orange-500/10 to-transparent'
                        : 'border-[color:var(--border)] hover:border-[color:var(--accent)]/50'
                    }`}
                  >
                    {/* Header compacto - siempre visible */}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Ticket Number Badge - más pequeño */}
                        <div className={`relative flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-white font-black shadow-md p-1.5 sm:p-2 md:p-2.5 ${
                          isWinner
                            ? 'bg-gradient-to-br from-yellow-400 dark:from-yellow-500 via-orange-500 dark:via-orange-600 to-pink-500 dark:to-pink-600'
                            : 'bg-gradient-to-br from-[color:var(--accent)] to-orange-500 dark:to-orange-600'
                        }`}>
                          <span className="text-[9px] sm:text-[10px] md:text-xs opacity-75 mb-0.5 sm:mb-1 whitespace-nowrap">BOLETO</span>
                          <span 
                            className="leading-tight text-center px-0.5 w-full break-all"
                            style={{ 
                              fontSize: entry.ticket_number.length > 15 ? 'clamp(0.65rem, 1.5vw, 0.9rem)' :
                                        entry.ticket_number.length > 12 ? 'clamp(0.75rem, 1.7vw, 1rem)' :
                                        entry.ticket_number.length > 10 ? 'clamp(0.85rem, 1.9vw, 1.1rem)' : 
                                        entry.ticket_number.length > 8 ? 'clamp(0.95rem, 2.1vw, 1.2rem)' : 
                                        entry.ticket_number.length > 6 ? 'clamp(1.05rem, 2.3vw, 1.35rem)' : 'clamp(1.2rem, 2.5vw, 1.6rem)',
                              wordBreak: 'break-all',
                              overflowWrap: 'break-word',
                              hyphens: 'auto'
                            }}
                            title={`#${entry.ticket_number}`}
                          >
                            #{entry.ticket_number}
                          </span>
                          {isWinner && (
                            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-1.5 md:-right-1.5 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center shadow-md animate-bounce">
                              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Info principal compacta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={`text-sm sm:text-base font-bold truncate ${isWinner ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'}`}>
                              {raffle.title}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isPending && (
                                <span className="px-2 py-0.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[9px] sm:text-[10px] font-bold rounded-full whitespace-nowrap">
                                  PENDIENTE
                                </span>
                              )}
                              {isWinner && (
                                <span className="px-2 py-0.5 bg-yellow-500 dark:bg-yellow-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full whitespace-nowrap animate-pulse">
                                  GANADOR
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] line-clamp-1 mb-1.5">
                            {raffle.prize_description}
                          </p>
                          <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-[color:var(--muted-foreground)]">
                            <span>{drawDate.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {entry.entry_source === 'subscription' ? (
                                <>
                                  <CreditCard className="w-2.5 h-2.5" />
                                  <span>Suscripción</span>
                                </>
                              ) : (
                                <>
                                  <Ticket className="w-2.5 h-2.5" />
                                  <span>Compra</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Botón expandir */}
                        <button
                          onClick={() => toggleCard(entry.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[color:var(--muted)]/50 transition-colors"
                          aria-label={isExpanded ? 'Contraer detalles' : 'Expandir detalles'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--muted-foreground)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--muted-foreground)]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detalles expandibles */}
                    {isExpanded && (
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-[color:var(--border)] pt-3 sm:pt-4 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-[9px] sm:text-[10px] text-[color:var(--muted-foreground)] mb-0.5">Fecha Registro</p>
                            <p className="text-[10px] sm:text-xs font-semibold text-[color:var(--foreground)]">
                              {new Date(entry.created_at).toLocaleDateString('es-EC', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] sm:text-[10px] text-[color:var(--muted-foreground)] mb-0.5">Fecha Sorteo</p>
                            <p className={`text-[10px] sm:text-xs font-semibold ${isWinner ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'}`}>
                              {drawDate.toLocaleDateString('es-EC', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] sm:text-[10px] text-[color:var(--muted-foreground)] mb-0.5">Estado</p>
                            <p className="text-[10px] sm:text-xs font-semibold text-[color:var(--foreground)] flex items-center gap-1">
                              {raffle.status === 'active' && (
                                <>
                                  <Target className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span>Activo</span>
                                </>
                              )}
                              {raffle.status === 'completed' && (
                                <>
                                  <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span>Completado</span>
                                </>
                              )}
                              {raffle.status === 'drawn' && (
                                <>
                                  <Dices className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span>Sorteado</span>
                                </>
                              )}
                              {raffle.status === 'draft' && (
                                <>
                                  <FileText className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span>Borrador</span>
                                </>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] sm:text-[10px] text-[color:var(--muted-foreground)] mb-0.5">Premio</p>
                            <p className="text-[10px] sm:text-xs font-semibold text-[color:var(--foreground)] line-clamp-2">
                              {raffle.prize_description}
                            </p>
                          </div>
                        </div>

                        {/* Winner Message */}
                        {isWinner && (
                          <div className="p-2.5 sm:p-3 bg-gradient-to-r from-yellow-500/10 dark:from-yellow-500/20 to-orange-500/10 dark:to-orange-500/20 border border-yellow-500/30 dark:border-yellow-500/50 rounded-lg">
                            <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-bold text-[10px] sm:text-xs">
                              <Sparkles className="w-3 h-3 animate-pulse flex-shrink-0" />
                              <span>¡Felicidades! Has ganado este sorteo</span>
                              <Sparkles className="w-3 h-3 animate-pulse flex-shrink-0" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón cargar más */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 dark:from-[color:var(--accent)]/20 dark:to-orange-500/20 border border-[color:var(--border)] rounded-xl text-sm font-semibold text-[color:var(--accent)] hover:from-[color:var(--accent)]/20 hover:to-orange-500/20 dark:hover:from-[color:var(--accent)]/30 dark:hover:to-orange-500/30 transition-all"
                >
                  <span>Ver más boletos</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <p className="text-xs text-[color:var(--muted-foreground)] mt-2">
                  Mostrando {displayedEntries.length} de {filteredEntries.length} boletos
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
