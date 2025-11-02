'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const detect = () => setIsMobile(window.innerWidth < 640);
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

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
    <section id="planes" className="scroll-mt-header space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="space-y-2 text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Planes TuSuerte
          </span>
          <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Elige el plan perfecto para ti</h2>
          <p className="mx-auto max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
            Selecciona el plan que mejor se adapte a tus necesidades y comienza a disfrutar de todos los beneficios de TuSuerte.
          </p>
        </div>
      </div>

      {/* Grid de planes */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isPopular = plan.is_featured;
          const benefits = plan.benefits ?? [];
          const isExpanded = expandedPlans[plan.id] ?? false;
          const visibleBenefits = !isMobile ? benefits : benefits.slice(0, isExpanded ? benefits.length : 3);
          const hiddenBenefitsCount = !isMobile ? 0 : benefits.length - visibleBenefits.length;
          
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

      {/* Nota adicional */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-6 text-center">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          💡 <strong>¿No estás seguro?</strong> Todos los planes incluyen garantía de satisfacción. Cancela en cualquier momento sin compromiso.
        </p>
      </div>
    </section>
  );
}
