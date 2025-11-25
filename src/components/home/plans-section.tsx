'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  benefits: string[] | null;
  max_concurrent_raffles: number | null;
  show_raffles_limit: boolean;
  raffles_limit_message: string | null;
  is_active: boolean;
  is_featured: boolean;
};

type PlansSectionProps = {
  plans: Plan[];
};

const INTERVAL_LABELS = {
  month: 'mes',
  year: 'año',
};

export function PlansSection({ plans = [] }: Readonly<PlansSectionProps>) {
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play cada 4 segundos
  useEffect(() => {
    if (!isAutoPlaying || plans.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % plans.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, plans.length]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  const pauseAndResume = () => {
    setIsAutoPlaying(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    autoPlayTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 8000);
  };

  const handlePrevious = () => {
    pauseAndResume();
    setCurrentIndex((prev) => (prev - 1 + plans.length) % plans.length);
  };

  const handleNext = () => {
    pauseAndResume();
    setCurrentIndex((prev) => (prev + 1) % plans.length);
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency;
    return `${symbol}${price.toFixed(2)}`;
  };

  const togglePlan = (planId: string) => {
    setExpandedPlans((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  if (plans.length === 0) {
    return (
      <section id="planes" className="scroll-mt-header space-y-8 sm:space-y-10">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
              Planes TuSuerte
            </span>
            <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Elige el plan que más te guste</h2>
            <p className="max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
              Próximamente tendremos planes especiales para ti. ¡Mantente atento!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="planes" className="scroll-mt-header space-y-8 sm:space-y-10 relative">
      {/* decorative orbs */}
      <div className="absolute -left-16 -top-8 w-44 h-44 rounded-full bg-[color:var(--accent)]/6 blur-3xl pointer-events-none" />
      <div className="absolute right-8 -top-4 w-28 h-28 rounded-full bg-blue-500/6 blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="space-y-2 text-center">
          <span className="block text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            ⭐ Planes TuSuerte
          </span>
          <h2 className="text-2xl font-extrabold sm:text-3xl md:text-4xl text-[color:var(--foreground)]">Elige el plan perfecto para ti</h2>
          <p className="mx-auto max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
            Selecciona el plan que mejor se adapte a tus necesidades y comienza a disfrutar de todos los beneficios de TuSuerte.
          </p>
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Planes con garantía y beneficios exclusivos.</p>
        </div>
      </div>

      {/* Carrusel móvil - visible solo en pantallas pequeñas */}
      <div className="block sm:hidden">
        <div className="relative px-8">
          {/* Botones de navegación */}
          <button
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--background)] p-2 shadow-xl border border-[color:var(--border)] transition-all active:scale-95"
            aria-label="Anterior"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[color:var(--background)] p-2 shadow-xl border border-[color:var(--border)] transition-all active:scale-95"
            aria-label="Siguiente"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Contenedor del carrusel */}
          <div className="overflow-hidden pt-4 pb-6">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
          {plans.map((plan) => {
            const isPopular = plan.is_featured;
            const benefits = plan.benefits ?? [];
            const isExpanded = expandedPlans[plan.id] ?? false;
            const visibleBenefits = benefits.slice(0, isExpanded ? benefits.length : 3);
            const hiddenBenefitsCount = benefits.length - visibleBenefits.length;

            return (
              <article
                key={plan.id}
                className={`w-full flex-shrink-0 px-3 relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl ${
                  isPopular
                    ? 'border-[color:var(--accent)] bg-gradient-to-br from-[color:var(--accent)]/5 to-[color:var(--accent)]/10 shadow-lg'
                    : 'border-[color:var(--border)] bg-[color:var(--background)]'
                }`}
              >
                {/* Badge "Popular" */}
                {isPopular && (
                  <div className="absolute right-4 top-4 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      ⭐ Popular
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xl font-bold text-[color:var(--foreground)]">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[color:var(--foreground)]">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      <span className="text-sm text-[color:var(--muted-foreground)]">/{INTERVAL_LABELS[plan.interval]}</span>
                    </div>
                  </div>

                  {plan.show_raffles_limit && plan.max_concurrent_raffles && (
                    <div className="mb-4 rounded-lg bg-blue-500/10 px-3 py-2 text-sm">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {plan.raffles_limit_message 
                          ? plan.raffles_limit_message.replace('{limit}', plan.max_concurrent_raffles.toString())
                          : `🎯 Hasta ${plan.max_concurrent_raffles} sorteos simultáneos`
                        }
                      </span>
                    </div>
                  )}

                  {benefits.length > 0 && (
                    <ul className="mb-3 flex-1 space-y-3">
                      {visibleBenefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">✓</span>
                          <span className="text-[color:var(--foreground)]">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {hiddenBenefitsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => togglePlan(plan.id)}
                      className="mb-6 inline-flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)] transition-colors hover:text-[color:var(--accent)]/80"
                    >
                      {isExpanded ? 'Ver menos beneficios' : `Ver ${hiddenBenefitsCount} beneficios más`}
                    </button>
                  )}

                  <Link
                    href="/registro"
                    className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-transform duration-200 ${
                      isPopular
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg hover:shadow-xl transform-gpu hover:-translate-y-0.5'
                        : 'border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)] hover:-translate-y-0.5'
                    }`}
                  >
                    {isPopular ? '🚀 Comenzar ahora' : 'Seleccionar plan'}
                  </Link>
                </div>
              </article>
            );
          })}
            </div>
          </div>

          {/* Indicadores de posición (dots) */}
          <div className="mt-8 flex justify-center gap-2">
            {plans.map((plan, idx) => (
              <button
                key={`dot-${plan.id}`}
                onClick={() => {
                  pauseAndResume();
                  setCurrentIndex(idx);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-10 bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'w-2.5 bg-[color:var(--muted-foreground)]/30 hover:bg-[color:var(--muted-foreground)]/60'
                }`}
                aria-label={`Ver plan ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid desktop - visible solo en pantallas medianas/grandes */}
      <div className="hidden sm:block">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
          const isPopular = plan.is_featured;
          const benefits = plan.benefits ?? [];
          const isExpanded = expandedPlans[plan.id] ?? false;
          const visibleBenefits = benefits;
          const hiddenBenefitsCount = 0;
          
            return (
            <article
              key={plan.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl ${
                isPopular
                  ? 'border-[color:var(--accent)] bg-gradient-to-br from-[color:var(--accent)]/5 to-[color:var(--accent)]/10 shadow-lg'
                  : 'border-[color:var(--border)] bg-[color:var(--background)]'
              }`}
            >
              {/* Badge "Popular" */}
              {isPopular && (
                <div className="absolute right-4 top-4 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    ⭐ Popular
                  </span>
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                {/* Nombre y descripción */}
                <div className="mb-6 space-y-2">
                  <h3 className="text-xl font-bold text-[color:var(--foreground)]">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>
                  )}
                </div>

                {/* Precio */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[color:var(--foreground)]">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-sm text-[color:var(--muted-foreground)]">
                      /{INTERVAL_LABELS[plan.interval]}
                    </span>
                  </div>
                </div>

                {/* Sorteos simultáneos */}
                {plan.show_raffles_limit && plan.max_concurrent_raffles && (
                  <div className="mb-4 rounded-lg bg-blue-500/10 px-3 py-2 text-sm">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {plan.raffles_limit_message 
                        ? plan.raffles_limit_message.replace('{limit}', plan.max_concurrent_raffles.toString())
                        : `🎯 Hasta ${plan.max_concurrent_raffles} sorteos simultáneos`
                      }
                    </span>
                  </div>
                )}

                {/* Beneficios */}
                {benefits.length > 0 && (
                  <ul className="mb-3 flex-1 space-y-3">
                    {visibleBenefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          ✓
                        </span>
                        <span className="text-[color:var(--foreground)]">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {hiddenBenefitsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    className="mb-6 inline-flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)] transition-colors hover:text-[color:var(--accent)]/80"
                  >
                    {isExpanded ? 'Ver menos beneficios' : `Ver ${hiddenBenefitsCount} beneficios más`}
                  </button>
                )}

                {/* Botón CTA */}
                <Link
                  href="/registro"
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:scale-105 ${
                    isPopular
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
                      : 'border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]'
                  }`}
                >
                  {isPopular ? '🚀 Comenzar ahora' : 'Seleccionar plan'}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      </div>

      {/* Nota adicional */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-6 text-center">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          💡 <strong>¿No estás seguro?</strong> Todos los planes incluyen garantía de satisfacción. Cancela en cualquier momento sin compromiso.
        </p>
      </div>
    </section>
  );
}
