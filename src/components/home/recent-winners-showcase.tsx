'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

type Winner = {
  id: string;
  prize_description: string;
  delivery_photo_url: string | null;
  delivered_at: string | null;
  prize_position: number | null;
  testimonial: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  raffles: {
    title: string;
  } | null;
};

type RecentWinnersShowcaseProps = {
  winners: any[];
  totalCount?: number;
};

export function RecentWinnersShowcase({ winners, totalCount }: Readonly<RecentWinnersShowcaseProps>) {
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [cardWidth, setCardWidth] = useState(33.333);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Transformar los datos - asegurar que profiles y raffles sean objetos
  // Usar useMemo para evitar re-cálculos y mantener la referencia estable
  const transformedWinners: Winner[] = useMemo(() => {
    return winners.map((w) => ({
      id: w.id,
      prize_description: w.prize_description || 'Premio',
      delivery_photo_url: w.delivery_photo_url,
      delivered_at: w.delivered_at,
      prize_position: w.prize_position,
      testimonial: w.testimonial,
      profiles: w.profiles && typeof w.profiles === 'object' 
        ? { 
            full_name: w.profiles.full_name || 'Ganador', 
            avatar_url: w.profiles.avatar_url || null 
          }
        : { full_name: 'Ganador', avatar_url: null },
      raffles: w.raffles && typeof w.raffles === 'object'
        ? { title: w.raffles.title || 'Sorteo' }
        : { title: 'Sorteo' },
    }));
  }, [winners]);

  // Duplicar ganadores para crear efecto infinito (2x) si hay al menos 2 elementos
  // Reducción de duplicación para mejorar performance y evitar repeticiones excesivas
  const displayWinners = transformedWinners.length >= 2
    ? [...transformedWinners, ...transformedWinners]
    : transformedWinners;
  

  // Calcular el ancho de cada card según pantalla
  useEffect(() => {
    const updateCardWidth = () => {
    if (globalThis.window === undefined) return;
      if (globalThis.window.innerWidth < 640) {
        setCardWidth(100); // móvil: 1 card
      } else if (globalThis.window.innerWidth < 1024) {
        setCardWidth(50); // tablet: 2 cards
      } else {
        setCardWidth(33.333); // desktop: 3 cards
      }
    };

    updateCardWidth();
    globalThis.window.addEventListener('resize', updateCardWidth);
    return () => globalThis.window.removeEventListener('resize', updateCardWidth);
  }, []);

  // Carrusel automático cada 4 segundos
  useEffect(() => {
    if (!isAutoPlaying || transformedWinners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayWinners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, displayWinners.length, transformedWinners.length]);

  // Función para pausar temporalmente y reanudar después de 8 segundos de inactividad
  const pauseAndResume = () => {
    setIsAutoPlaying(false);
    
    // Limpiar timeout anterior si existe
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    
    // Reanudar después de 8 segundos de inactividad
    autoPlayTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 8000);
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  const handlePrevious = () => {
    pauseAndResume();
    setCurrentIndex((prev) => (prev - 1 + displayWinners.length) % displayWinners.length);
  };

  const handleNext = () => {
    pauseAndResume();
    setCurrentIndex((prev) => (prev + 1) % displayWinners.length);
  };

  if (transformedWinners.length === 0) {
    return null;
  }

  return (
    <section id="ganadores" className="scroll-mt-header space-y-8 sm:space-y-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
            🏆 Ganadores del Mes
          </h2>
          <p className="mt-4 text-lg text-[color:var(--muted-foreground)]">
            {((totalCount ?? transformedWinners.length) === 1)
              ? 'Felicitamos a nuestro ganador que ya recibió su premio'
              : `Celebramos junto a ${totalCount ?? transformedWinners.length} ganadores que ya recibieron sus premios`}
            {transformedWinners.length > 0 && (
              <span className="block mt-2 text-sm text-[color:var(--muted-foreground)]">
                Mostrando los últimos {transformedWinners.length} ganadores en el carrusel.
              </span>
            )}
          </p>
        </div>

        {/* Carrusel de corrida continua */}
        <div className="relative px-8 sm:px-12 md:px-16">
          {/* Botones de navegación - ocultos en móvil */}
          <button
            onClick={handlePrevious}
            className="hidden sm:block absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--background)] p-2 sm:p-3 shadow-xl border border-[color:var(--border)] transition-all hover:scale-110 hover:shadow-2xl"
            aria-label="Anterior"
          >
            <span className="text-xl sm:text-2xl">←</span>
          </button>
          <button
            onClick={handleNext}
            className="hidden sm:block absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--background)] p-2 sm:p-3 shadow-xl border border-[color:var(--border)] transition-all hover:scale-110 hover:shadow-2xl"
            aria-label="Siguiente"
          >
            <span className="text-xl sm:text-2xl">→</span>
          </button>

          {/* Contenedor del carrusel */}
          <div className="overflow-hidden py-8">
            <div 
              ref={carouselRef}
              className="flex gap-3 sm:gap-4 md:gap-6 transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * cardWidth}%)`
              }}
            >
              {displayWinners.map((winner, index) => (
                <div
                  key={`${winner.id}-${index}`}
                  onClick={() => setSelectedWinner(winner)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg transition-all hover:shadow-2xl hover:scale-[1.02] flex-shrink-0 w-[calc(100%-12px)] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-16px)]"
                >
                  {/* Foto de entrega */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20">
                    {winner.delivery_photo_url ? (
                      <img
                        src={winner.delivery_photo_url}
                        alt={`${winner.profiles?.full_name} - Ganador`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-6xl opacity-50">🎁</span>
                      </div>
                    )}
                    
                    {/* Badge de ganador */}
                    <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      🏆 Ganador
                    </div>
                  </div>

                  {/* Información */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-[color:var(--foreground)]">
                      {winner.profiles?.full_name || 'Ganador Anónimo'}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {winner.prize_description || 'Premio sorteado'}
                    </p>
                    <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                      {winner.raffles?.title || 'Sorteo'}
                    </p>
                    {winner.delivered_at && (
                      <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                        Entregado el {new Date(winner.delivered_at).toLocaleDateString('es-EC', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                    {winner.testimonial && (
                      <div className="mt-3 rounded-lg bg-[color:var(--muted)]/50 p-3">
                        <p className="line-clamp-3 text-xs italic text-[color:var(--foreground)]">
                          "{winner.testimonial}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de navegación móvil - debajo del carrusel */}
          <div className="mt-4 flex justify-center gap-4 sm:hidden">
            <button
              onClick={handlePrevious}
              className="rounded-full bg-[color:var(--background)] p-2 shadow-lg border border-[color:var(--border)] transition-all active:scale-95"
              aria-label="Anterior"
            >
              <span className="text-xl">←</span>
            </button>
            <button
              onClick={handleNext}
              className="rounded-full bg-[color:var(--background)] p-2 shadow-lg border border-[color:var(--border)] transition-all active:scale-95"
              aria-label="Siguiente"
            >
              <span className="text-xl">→</span>
            </button>
          </div>

          {/* Indicadores de posición (dots) */}
          <div className="mt-8 flex justify-center gap-2">
            {transformedWinners.map((_, idx) => (
              <button
                key={`dot-${transformedWinners[idx].id}`}
                onClick={() => {
                  pauseAndResume();
                  setCurrentIndex(idx);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex % transformedWinners.length === idx
                    ? 'w-10 bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'w-2.5 bg-[color:var(--muted-foreground)]/30 hover:bg-[color:var(--muted-foreground)]/60'
                }`}
                aria-label={`Ver ganador ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
      {selectedWinner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedWinner(null)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setSelectedWinner(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <span className="text-xl">✕</span>
            </button>

            {/* Imagen principal */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20">
              {selectedWinner.delivery_photo_url ? (
                <img
                  src={selectedWinner.delivery_photo_url}
                  alt={`${selectedWinner.profiles?.full_name} - Ganador`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-8xl opacity-50">🎁</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🏆</span>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {selectedWinner.profiles?.full_name || 'Ganador Anónimo'}
                    </h3>
                    <p className="text-sm opacity-90">
                      {selectedWinner.prize_description || 'Premio sorteado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles */}
            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Sorteo</p>
                <p className="mt-1 font-semibold text-[color:var(--foreground)]">
                  {selectedWinner.raffles?.title || 'Sorteo'}
                </p>
              </div>

              {selectedWinner.delivered_at && (
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
                  <p className="text-sm text-[color:var(--muted-foreground)]">Fecha de entrega</p>
                  <p className="mt-1 font-semibold text-[color:var(--foreground)]">
                    {new Date(selectedWinner.delivered_at).toLocaleDateString('es-EC', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}

              {selectedWinner.testimonial && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    💬 Testimonio del ganador
                  </p>
                  <p className="mt-2 text-sm italic text-amber-900 dark:text-amber-200">
                    "{selectedWinner.testimonial}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}