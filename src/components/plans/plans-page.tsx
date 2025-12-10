"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gem, CheckCircle2, CreditCard, Star, ChevronDown, Sparkles } from 'lucide-react';
import StripeSubscriptionModal from '../payments/stripe-subscription-modal';

type Plan = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly interval: string;
  readonly benefits: Record<string, unknown> | string[] | string | null; // JSONB column
  readonly is_active: boolean | null;
  readonly is_featured: boolean | null;
  readonly max_concurrent_raffles: number | null;
};

type Subscription = {
  readonly id: string;
  readonly plan_id: string;
  readonly status: string;
  readonly current_period_start: string;
  readonly current_period_end: string;
  readonly plans: Plan | Plan[]; // Supabase puede retornar array o objeto
};

type PlansPageProps = {
  readonly plans: Plan[];
  readonly userSubscriptions: Subscription[];
};

export function PlansPage({ plans, userSubscriptions }: PlansPageProps) {
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>('monthly');
  const [modalPlanId, setModalPlanId] = useState<string | null>(null);

  const modalPlan = useMemo(() => {
    if (!modalPlanId) return null;
    return plans.find((plan) => plan.id === modalPlanId) ?? null;
  }, [plans, modalPlanId]);

  const modalPlanLite = useMemo(() => {
    if (!modalPlan) return null;
    const { id, name, price, currency, interval, description } = modalPlan;
    return { id, name, price, currency, interval, description };
  }, [modalPlan]);
  const activeSubscription = userSubscriptions.find(sub => sub.status === 'active');
  
  // Normalize plan data (could be array or object from Supabase join)
  const getSubscriptionPlan = (subscription: Subscription): Plan | null => {
    if (!subscription.plans) return null;
    return Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans;
  };
  
  const filteredPlans = plans.filter(plan => 
    plan.interval === (selectedInterval === 'monthly' ? 'month' : 'year')
  );

  const getPlanFeatures = (plan: Plan): string[] => {
    const features: string[] = [];

    const benefitSource = plan.benefits;
    if (benefitSource) {
      if (Array.isArray(benefitSource)) {
        features.push(...benefitSource.map((item) => String(item)).filter(Boolean));
      } else if (typeof benefitSource === 'string') {
        const raw = benefitSource.trim();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              features.push(...parsed.map((item) => String(item)).filter(Boolean));
            }
          } catch (_) {
            features.push(
              ...raw
                .split(/[\n,?;-]+/)
                .map((text) => text.trim())
                .filter(Boolean)
            );
          }
        }
      } else if (typeof benefitSource === 'object') {
        const benefits = benefitSource as Record<string, unknown>;

        if (typeof benefits.ticket_allocation === 'number') {
          features.push(`${benefits.ticket_allocation} boletos mensuales incluidos`);
        }
        if (benefits.priority_support) {
          features.push('Soporte prioritario 24/7');
        }
        if (benefits.early_access) {
          features.push('Acceso anticipado a sorteos exclusivos');
        }
        if (Array.isArray(benefits.features)) {
          features.push(...(benefits.features as string[]));
        }
      }
    }

    if (plan.max_concurrent_raffles && plan.max_concurrent_raffles > 0) {
      features.push(`Hasta ${plan.max_concurrent_raffles} sorteos simultáneos`);
    }

    if (features.length === 0) {
      features.push(
        'Acceso a todos los sorteos activos',
        'Notificaciones de nuevos sorteos',
        'Historial de participaciones'
      );
    }

    return features;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)]/10 dark:to-[color:var(--muted)]/5 py-6 sm:py-8 px-3 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header */}
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 dark:hover:text-orange-400 transition-colors mb-3 sm:mb-4"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Volver al Dashboard</span>
        </Link>
        <div className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[color:var(--foreground)] flex items-center justify-center gap-2 sm:gap-3">
            <Gem className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[color:var(--accent)]" />
            <span>Planes de Suscripción</span>
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-[color:var(--muted-foreground)] max-w-2xl mx-auto px-4">
            Elige el plan perfecto para ti y participa automáticamente en todos los sorteos
          </p>
        </div>

        {/* Active Subscription Alert */}
        {activeSubscription && (() => {
          const currentPlan = getSubscriptionPlan(activeSubscription);
          if (!currentPlan) return null;
          
          return (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-gradient-to-r from-green-500/10 dark:from-green-500/20 to-emerald-600/10 dark:to-emerald-600/20 border-2 border-green-500/30 dark:border-green-500/50 rounded-xl sm:rounded-2xl">
              <div className="flex items-start gap-3 sm:gap-4">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">Suscripci?n Activa</h3>
                  <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mt-1">
                    Actualmente tienes el paquete de <span className="font-bold">{currentPlan.name}</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-2">
                    Renovaci?n: {new Date(activeSubscription.current_period_end).toLocaleDateString('es-EC')}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Interval Toggle */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex bg-[color:var(--muted)] p-1 rounded-lg sm:rounded-xl">
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                selectedInterval === 'monthly'
                  ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600 text-white shadow-lg'
                  : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setSelectedInterval('annual')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all relative ${
                selectedInterval === 'annual'
                  ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600 text-white shadow-lg'
                  : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
              }`}
            >
              Anual
              <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 px-1.5 sm:px-2 py-0.5 bg-green-500 dark:bg-green-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <div className="text-center py-12 sm:py-16 border-2 border-dashed border-[color:var(--border)] rounded-xl sm:rounded-2xl">
            <CreditCard className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-[color:var(--muted-foreground)]" />
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-[color:var(--foreground)]">No hay planes disponibles</h3>
            <p className="text-sm sm:text-base text-[color:var(--muted-foreground)]">Pronto agregaremos nuevos planes</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan, index) => {
              const isPopular = (plan as any).is_featured ?? index === 1; // prefer DB flag
              const isCurrentPlan = activeSubscription?.plan_id === plan.id;
              const features = getPlanFeatures(plan);

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl ${
                    isPopular
                      ? 'border-[color:var(--accent)] dark:border-[color:var(--accent)]/80 bg-gradient-to-br from-[color:var(--accent)]/5 dark:from-[color:var(--accent)]/10 to-[color:var(--accent)]/10 dark:to-[color:var(--accent)]/15 shadow-lg'
                      : 'border-[color:var(--border)] bg-[color:var(--card)]'
                  }`}
                >
                  {/* Badge */}
                  {isPopular && (
                    <div className="absolute right-3 sm:right-4 top-3 sm:top-4 z-10">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 dark:from-orange-600 to-pink-500 dark:to-pink-600 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white shadow-lg">
                        <Star className="w-3 h-3 fill-white" />
                        <span>Popular</span>
                      </span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-4 sm:p-6">
                    <div className="mb-4 sm:mb-6 space-y-2">
                      <h3 className="text-lg sm:text-xl font-bold text-[color:var(--foreground)]">{plan.name}</h3>
                      <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] min-h-[40px]">{plan.description}</p>
                    </div>

                    <div className="mb-4 sm:mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold text-[color:var(--foreground)]">${plan.price.toFixed?.(2) ?? plan.price}</span>
                        <span className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">/{plan.interval === 'month' ? 'mes' : 'año'}</span>
                      </div>
                      {plan.interval === 'year' && (
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-semibold mt-1">Ahorra ${(plan.price * 0.2).toFixed(2)} al año</p>
                      )}
                    </div>

                    {plan.max_concurrent_raffles && (
                      <div className="mb-4 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Hasta {plan.max_concurrent_raffles} sorteos simultáneos</span>
                      </div>
                    )}

                    {features.length > 0 && (
                      <ul className="mb-4 sm:mb-6 flex-1 space-y-2 sm:space-y-3">
                        {features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                            <CheckCircle2 className="mt-0.5 flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[color:var(--foreground)]">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto">
                      {isCurrentPlan ? (
                        <button
                          type="button"
                          disabled
                          className="w-full rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)] cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Plan Actual</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalPlanId(plan.id)}
                          className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all ${
                            isPopular 
                              ? 'bg-gradient-to-r from-orange-500 dark:from-orange-600 to-pink-500 dark:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]' 
                              : 'border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]'
                          }`}
                        >
                          {activeSubscription ? 'Cambiar a este Plan' : 'Suscribirme Ahora'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {modalPlanLite && (
          <StripeSubscriptionModal
            plan={modalPlanLite}
            onClose={() => setModalPlanId(null)}
            onSuccess={() => {
              setModalPlanId(null);
              window.location.reload();
            }}
          />
        )}

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-12 sm:mt-16 space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-center text-[color:var(--foreground)]">Preguntas Frecuentes</h2>
          
          <div className="space-y-3 sm:space-y-4">
            {[
              {
                q: '¿Puedo cancelar en cualquier momento?',
                a: 'Sí, puedes cancelar tu suscripción en cualquier momento desde tu configuración. Seguirás teniendo acceso hasta el final del período de facturación.'
              },
              {
                q: '¿Qué pasa si no gano?',
                a: 'Tu suscripción te da acceso continuo a participar en todos los sorteos. Cada sorteo es una nueva oportunidad de ganar.'
              },
              {
                q: '¿Puedo cambiar de plan?',
                a: 'Por supuesto. Puedes actualizar o bajar de plan en cualquier momento, y ajustaremos el precio proporcionalmente.'
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group p-4 sm:p-6 border-2 border-[color:var(--border)] rounded-lg sm:rounded-xl hover:border-[color:var(--accent)]/50 dark:hover:border-[color:var(--accent)]/70 transition-all"
              >
                <summary className="font-bold text-sm sm:text-base text-[color:var(--foreground)] cursor-pointer list-none flex items-center justify-between gap-2">
                  <span className="flex-1">{faq.q}</span>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--accent)] group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-[color:var(--muted-foreground)] leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
