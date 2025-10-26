'use client';

import { useState } from 'react';

type Plan = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly interval: string;
  readonly benefits: Record<string, unknown> | null; // JSONB column
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
    
    // Parse benefits JSONB field
    if (plan.benefits && typeof plan.benefits === 'object') {
      // Extract features from benefits object
      const benefits = plan.benefits;
      
      // Common benefit keys to check
      if (benefits.ticket_allocation && typeof benefits.ticket_allocation === 'number') {
        features.push(`${benefits.ticket_allocation} boletos mensuales incluidos`);
      }
      if (benefits.priority_support) {
        features.push('Soporte prioritario 24/7');
      }
      if (benefits.early_access) {
        features.push('Acceso anticipado a sorteos exclusivos');
      }
      if (benefits.features && Array.isArray(benefits.features)) {
        features.push(...(benefits.features as string[]));
      }
    }
    
    // Add max concurrent raffles if available
    if (plan.max_concurrent_raffles && plan.max_concurrent_raffles > 0) {
      features.push(`Hasta ${plan.max_concurrent_raffles} sorteos simultáneos`);
    }
    
    // Default features if none defined
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
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-[color:var(--foreground)]">💎 Planes de Suscripción</h1>
          <p className="text-lg text-[color:var(--muted-foreground)] max-w-2xl mx-auto">
            Elige el plan perfecto para ti y participa automáticamente en todos los sorteos
          </p>
        </div>

        {/* Active Subscription Alert */}
        {activeSubscription && (() => {
          const currentPlan = getSubscriptionPlan(activeSubscription);
          if (!currentPlan) return null;
          
          return (
            <div className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-green-500/10 to-emerald-600/10 border-2 border-green-500/30 rounded-2xl">
              <div className="flex items-start gap-4">
                <span className="text-4xl">✅</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400">Suscripción Activa</h3>
                  <p className="text-sm text-[color:var(--muted-foreground)] mt-1">
                    Actualmente tienes el plan <span className="font-bold">{currentPlan.name}</span>
                  </p>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-2">
                    Renovación: {new Date(activeSubscription.current_period_end).toLocaleDateString('es-EC')}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Interval Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-[color:var(--muted)] p-1 rounded-xl">
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedInterval === 'monthly'
                  ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white shadow-lg'
                  : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setSelectedInterval('annual')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all relative ${
                selectedInterval === 'annual'
                  ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white shadow-lg'
                  : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[color:var(--border)] rounded-2xl">
            <span className="text-6xl block mb-4">💳</span>
            <h3 className="text-xl font-bold mb-2">No hay planes disponibles</h3>
            <p className="text-[color:var(--muted-foreground)]">Pronto agregaremos nuevos planes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredPlans.map((plan, index) => {
              const isPopular = index === 1; // Middle plan is popular
              const isPremium = index === filteredPlans.length - 1;
              const isCurrentPlan = activeSubscription?.plan_id === plan.id;
              const features = getPlanFeatures(plan);

              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-2xl ${
                    isPopular
                      ? 'border-[color:var(--accent)] shadow-lg scale-105'
                      : 'border-[color:var(--border)] hover:border-[color:var(--accent)]/50'
                  }`}
                >
                  {/* Badge - Solo mostrar uno */}
                  {isPopular && (
                    <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white text-xs font-bold rounded-bl-xl">
                      🔥 MÁS POPULAR
                    </div>
                  )}
                  
                  {!isPopular && isPremium && (
                    <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-bl-xl">
                      ⭐ PREMIUM
                    </div>
                  )}

                  <div className="p-8 space-y-6">
                    {/* Plan Header */}
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-[color:var(--foreground)]">{plan.name}</h3>
                      <p className="text-sm text-[color:var(--muted-foreground)] min-h-[40px]">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-[color:var(--accent)]">
                          ${plan.price}
                        </span>
                        <span className="text-[color:var(--muted-foreground)] text-sm">
                          /{plan.interval === 'month' ? 'mes' : 'año'}
                        </span>
                      </div>
                      {plan.interval === 'year' && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                          Ahorra ${(plan.price * 0.2).toFixed(2)} al año
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 py-6 border-y border-[color:var(--border)]">
                      {features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">✓</span>
                          <span className="text-sm text-[color:var(--foreground)]">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-4 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] rounded-xl font-bold cursor-not-allowed"
                      >
                        ✓ Plan Actual
                      </button>
                    ) : (
                      <button
                        className={`w-full py-4 rounded-xl font-bold transition-all hover:shadow-lg ${
                          isPopular || isPremium
                            ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white hover:scale-105'
                            : 'bg-[color:var(--muted)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/70'
                        }`}
                      >
                        {activeSubscription ? 'Cambiar a este Plan' : 'Suscribirme Ahora'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-16 space-y-6">
          <h2 className="text-2xl font-black text-center text-[color:var(--foreground)]">Preguntas Frecuentes</h2>
          
          <div className="space-y-4">
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
                className="group p-6 border-2 border-[color:var(--border)] rounded-xl hover:border-[color:var(--accent)]/50 transition-all"
              >
                <summary className="font-bold text-[color:var(--foreground)] cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-[color:var(--accent)] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-sm text-[color:var(--muted-foreground)] leading-relaxed">
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
