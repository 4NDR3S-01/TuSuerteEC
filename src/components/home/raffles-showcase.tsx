 'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {ArrowLeft, ArrowRight} from 'lucide-react'

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

type RafflesShowcaseProps = {
  kicker: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  raffles?: Raffle[];
  /** Conteo total de sorteos activos en la base de datos */
  totalCount?: number;
  /** Mostrar el CTA de inicio de sesión al final si hay más sorteos que los mostrados */
  showLoginCtaIfMore?: boolean;
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
    icon: '👥',
  },
  tickets_only: {
    label: 'Compra de Boletos',
    color: 'bg-green-500',
    icon: '🎫',
  },
  hybrid: {
    label: 'Suscriptores + Boletos',
    color: 'bg-purple-500',
    icon: '🎯',
  },
};

export function RafflesShowcase({
  kicker,
  title,
  description,
  raffles = [],
  totalCount,
  showLoginCtaIfMore = true,
}: Readonly<RafflesShowcaseProps>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [cardWidth, setCardWidth] = useState(33.333);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filtrar solo activos y limitar a los ya cargados por el servidor (p.ej. 6)
  const baseRaffles = (raffles || []).filter((r) => r.status === 'active');

  const transformedRaffles = useMemo(() => {
    return baseRaffles.map((r) => ({
      ...r,
      title: r.title || 'Sorteo',
      prize_description: r.prize_description || 'Premio',
    }));
  }, [baseRaffles]);

  // Determinar si debemos mostrar el CTA de login (cuando hay más sorteos en la base que los que cargamos)
  const showLoginCta = showLoginCtaIfMore && typeof totalCount === 'number' && totalCount > transformedRaffles.length;

  // Duplicar para efecto infinito si hay al menos 2 sorteos (no duplicamos el CTA para evitar repetición excesiva)
  const duplicated = transformedRaffles.length >= 2 ? [...transformedRaffles, ...transformedRaffles] : transformedRaffles;

  // Construir el array final que renderizaremos: duplicados + (CTA si aplica)
  const displayItems = showLoginCta ? [...duplicated, { __cta: true }] as any[] : duplicated;

  // Ajuste de ancho por breakpoint
  useEffect(() => {
    const updateCardWidth = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 640) {
        setCardWidth(100);
      } else if (window.innerWidth < 1024) {
        setCardWidth(50);
      } else {
        setCardWidth(33.333);
      }
    };
    updateCardWidth();
    window.addEventListener('resize', updateCardWidth);
    return () => window.removeEventListener('resize', updateCardWidth);
  }, []);

  // Autoplay cada 4s
  useEffect(() => {
    if (!isAutoPlaying || displayItems.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, displayItems.length]);

  // Pausar y reanudar después de 8s
  const pauseAndResume = () => {
    setIsAutoPlaying(false);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(() => setIsAutoPlaying(true), 8000);
  };

  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, []);

  const handlePrevious = () => {
    pauseAndResume();
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleNext = () => {
    pauseAndResume();
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  };

  if (transformedRaffles.length === 0 && !showLoginCta) {
    return (
      <section id="sorteos" className="scroll-mt-header space-y-8 sm:space-y-10">
        <div className="space-y-2 text-center">
          <span className="block text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent)' }}>
            {kicker}
          </span>
          <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{title}</h2>
          <p className="mx-auto max-w-3xl text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/20 p-12 text-center">
          <span className="mb-3 text-5xl opacity-50">🎲</span>
          <p className="text-lg font-semibold text-[color:var(--foreground)]">No hay sorteos activos en este momento</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Mantente atento a nuestras redes para los próximos sorteos</p>
        </div>
      </section>
    );
  }

  return (
    <section id="sorteos" className="scroll-mt-header space-y-8 sm:space-y-10">
      <div className="space-y-2 text-center">
        <span className="block text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent)' }}>
          {kicker}
        </span>
        <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{title}</h2>
        <p className="mx-auto max-w-3xl text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
      </div>

      <div className="relative px-8 sm:px-12 md:px-16">
        <button
          onClick={handlePrevious}
          className="hidden sm:block absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--background)] p-2 sm:p-3 shadow-xl border border-[color:var(--border)] transition-all hover:scale-110 hover:shadow-2xl"
          aria-label="Anterior"
        >
          <span className="text-xl sm:text-2xl"><ArrowLeft/> </span>
        </button>
        <button
          onClick={handleNext}
          className="hidden sm:block absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--background)] p-2 sm:p-3 shadow-xl border border-[color:var(--border)] transition-all hover:scale-110 hover:shadow-2xl"
          aria-label="Siguiente"
        >
          <span className="text-xl sm:text-2xl"><ArrowRight/></span>
        </button>

        <div className="overflow-hidden py-8">
          <div
            ref={carouselRef}
            className="flex gap-3 sm:gap-4 md:gap-6 transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * cardWidth}%)` }}
          >
            {displayItems.map((item: any, idx) => {
              if (item && item.__cta) {
                return (
                  <div
                    key={`cta-${idx}`}
                    className="flex-shrink-0 w-[calc(100%-12px)] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-16px)]"
                  >
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center">
                      <div>
                        <h3 className="text-lg font-bold">Inicia sesión para ver todos los sorteos</h3>
                        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Accede para explorar la lista completa y participar en más sorteos.</p>
                        <div className="mt-4 flex gap-3 justify-center">
                          <Link href="/iniciar-sesion" className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]">
                            Iniciar sesión
                          </Link>
                          <Link href="/registro" className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold">
                            Registrarme
                          </Link>
                        </div>
                        {typeof totalCount === 'number' && (
                          <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">Hay {totalCount} sorteos activos.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              const raffle: Raffle = item;

              return (
                <article
                  key={`${raffle.id}-${idx}`}
                  onClick={pauseAndResume}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg transition-all hover:shadow-2xl hover:scale-[1.02] flex-shrink-0 w-[calc(100%-12px)] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-16px)]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20">
                    {raffle.image_url ? (
                      <img
                        src={raffle.image_url}
                        alt={raffle.prize_description}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-6xl opacity-50">{CATEGORY_ICONS[raffle.prize_category || 'other'] || '🎁'}</span>
                      </div>
                    )}

                    <div className={`absolute right-3 top-3 rounded-full ${ENTRY_MODE_LABELS[raffle.entry_mode].color} px-3 py-1 text-xs font-bold text-white shadow-lg`}>
                      {ENTRY_MODE_LABELS[raffle.entry_mode].icon} {ENTRY_MODE_LABELS[raffle.entry_mode].label}
                    </div>

                    {raffle.is_trending && (
                      <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                        🔥 Tendencia
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-[color:var(--foreground)] line-clamp-1">{raffle.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--accent)]">🏆 {raffle.prize_description}</p>
                    {raffle.description && <p className="mt-2 text-xs text-[color:var(--muted-foreground)] line-clamp-2">{raffle.description}</p>}

                    <div className="flex items-center justify-between pt-2 text-xs text-[color:var(--muted-foreground)]">
                      <div>
                        <p>Finaliza:</p>
                        <p className="font-semibold text-[color:var(--foreground)]">{new Date(raffle.end_date).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <p>Sorteo:</p>
                        <p className="font-semibold text-[color:var(--foreground)]">{new Date(raffle.draw_date).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>

                    <Link href="/iniciar-sesion" className="mt-4 block w-full rounded-lg bg-[color:var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:bg-[color:var(--accent)]/90">
                      Participar ahora
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-4 sm:hidden">
          <button onClick={handlePrevious} className="rounded-full bg-[color:var(--background)] p-2 shadow-lg border border-[color:var(--border)] transition-all active:scale-95"><ArrowLeft/></button>
          <button onClick={handleNext} className="rounded-full bg-[color:var(--background)] p-2 shadow-lg border border-[color:var(--border)] transition-all active:scale-95"><ArrowRight/></button>
        </div>

        {/* Dots basados en la longitud real (no incluir CTA en el conteo visual) */}
        <div className="mt-8 flex justify-center gap-2">
          {transformedRaffles.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              onClick={() => {
                pauseAndResume();
                setCurrentIndex(idx);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${currentIndex % transformedRaffles.length === idx ? 'w-10 bg-gradient-to-r from-amber-500 to-orange-500' : 'w-2.5 bg-[color:var(--muted-foreground)]/30 hover:bg-[color:var(--muted-foreground)]/60'}`}
              aria-label={`Ver sorteo ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
