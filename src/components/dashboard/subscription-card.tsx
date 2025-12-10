'use client';

import Link from 'next/link';
import { CreditCard, Package, Star, Calendar, Timer, CheckCircle2, Gift, Settings } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  plans?: {
    name: string;
    price: number;
    interval?: string;
    benefits?: Record<string, unknown> | string[] | string | null;
  };
}

interface SubscriptionCardProps {
  readonly subscriptions: Subscription[];
}

export function SubscriptionCard({ subscriptions }: SubscriptionCardProps) {
  const extractBenefits = (plan?: Subscription['plans']) => {
    const benefitSource = plan?.benefits;
    if (!benefitSource) return [];

    if (Array.isArray(benefitSource)) {
      return benefitSource.map((item) => String(item)).filter(Boolean).slice(0, 6);
    }

    if (typeof benefitSource === 'string') {
      const raw = benefitSource.trim();
      if (!raw) return [];

      // Try to parse JSON array first
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item)).filter(Boolean).slice(0, 6);
        }
      } catch (_) {
        // Not JSON, fall back to splitting by newline/comma/bullet
      }
      return raw
        .split(/[\n,•;-]+/)
        .map((text) => text.trim())
        .filter(Boolean)
        .slice(0, 6);
    }

    if (typeof benefitSource !== 'object') return [];

    const chips: string[] = [];
    const benefits = benefitSource as Record<string, unknown>;

    if (typeof benefits.ticket_allocation === 'number') {
      chips.push(`${benefits.ticket_allocation} boletos incluidos`);
    }
    if (benefits.priority_support) {
      chips.push('Soporte prioritario 24/7');
    }
    if (benefits.early_access) {
      chips.push('Acceso anticipado');
    }
    if (Array.isArray(benefits.features)) {
      chips.push(...(benefits.features as string[]));
    }

    return chips.slice(0, 4);
  };

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="group relative bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 hover:border-[color:var(--accent)]/50 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[color:var(--accent)]" />
              <span>Mi Suscripción</span>
            </h2>
            <span className="px-3 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-semibold rounded-full">
              ¡Ninguna activa!
            </span>
          </div>
          
          <div className="text-center py-8">
            <div className="relative inline-block mb-4">
              <div className="animate-bounce">
                <Package className="w-16 h-16 text-[color:var(--muted-foreground)]" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-[color:var(--accent)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                !
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
              Sin Suscripciones Activas
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-sm mb-6 max-w-xs mx-auto">
              Suscríbete a un plan y participa automáticamente en todos los sorteos
            </p>
            <Link 
              href="/app/planes"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <Star className="w-4 h-4" />
              <span>Explorar Planes</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeSub = subscriptions[0];
  const daysUntilRenewal = Math.ceil((new Date(activeSub.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilRenewal <= 7;

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[color:var(--accent)]" />
          <span>Mi Suscripción</span>
        </h2>
        <span className="px-3 py-1 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse" />
          {subscriptions.length} Activa{subscriptions.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {subscriptions.map((sub) => {
          const renewalDate = new Date(sub.current_period_end);
          const daysLeft = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const isExpiring = daysLeft <= 7;
          const benefitChips = extractBenefits(sub.plans);

          return (
            <div
              key={sub.id}
              className="relative group overflow-hidden rounded-xl border-2 border-[color:var(--border)] hover:border-[color:var(--accent)] transition-all duration-300"
            >
              {/* Gradiente de fondo */}
              <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-[color:var(--foreground)] text-lg">
                        {sub.plans?.name || 'Plan Desconocido'}
                      </h3>
                      {isExpiring && (
                        <span className="px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full animate-pulse">
                          Próximo a renovar
                        </span>
                      )}
                    </div>
                    
                    {/* Información de renovación */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                        <Calendar className="w-3 h-3" />
                        <span>Renueva: {renewalDate.toLocaleDateString('es-EC', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Timer className="w-3 h-3" />
                        <span className={isExpiring ? 'text-amber-600 dark:text-amber-400' : 'text-[color:var(--muted-foreground)]'}>
                          {daysLeft} días restantes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Precio */}
                  {Boolean(sub.plans?.price) && (
                    <div className="text-right ml-4">
                      <p className="text-2xl font-black bg-gradient-to-br from-[color:var(--accent)] to-orange-500 bg-clip-text text-transparent">
                        ${sub.plans.price}
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)] font-medium">
                        /{sub.plans.interval || 'mes'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Barra de progreso del período */}
                <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted-foreground)] mb-2">
                    <span>Progreso del período</span>
                    <span className="font-semibold">{Math.max(0, Math.min(100, Math.round(((30 - daysLeft) / 30) * 100)))}%</span>
                  </div>
                  <div className="h-2 bg-[color:var(--muted)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExpiring 
                          ? 'bg-gradient-to-r from-amber-500 dark:from-amber-600 to-orange-500 dark:to-orange-600' 
                          : 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, ((30 - daysLeft) / 30) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Beneficios destacados */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {benefitChips.length > 0 ? (
                    benefitChips.map((benefit, idx) => (
                      <span
                        key={`${sub.id}-benefit-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-medium rounded-md"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          ✓
                        </span>
                        {benefit}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-medium rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Participación automática</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-medium rounded-md">
                        <Gift className="w-3 h-3" />
                        <span>Todos los sorteos activos</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA para gestionar suscripción */}
      <div className="mt-6 pt-6 border-t border-[color:var(--border)]">
        <Link
          href="/settings/subscriptions"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[color:var(--muted)] hover:bg-[color:var(--accent)]/10 text-[color:var(--foreground)] font-medium text-sm rounded-lg transition-all duration-300 hover:shadow-md"
        >
          <Settings className="w-4 h-4" />
          <span>Gestionar Suscripciones</span>
        </Link>
      </div>
    </div>
  );
}
