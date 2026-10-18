import { Check, Sparkles } from 'lucide-react';
import { Badge, ButtonLink } from '../ui/kit';
import { formatPrice } from '../../lib/raffle/labels';

export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  benefits: unknown;
  max_concurrent_raffles: number | null;
  show_raffles_limit: boolean;
  raffles_limit_message: string | null;
  is_featured: boolean;
};

/** Planes de suscripción con su precio y condiciones reales */
export function PlansGrid({ plans, ctaHref = '/app/planes' }: { plans: PublicPlan[]; ctaHref?: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const benefits = Array.isArray(plan.benefits) ? (plan.benefits as string[]) : [];
        return (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border bg-[color:var(--card)] p-6 shadow-[var(--shadow-card)] ${
              plan.is_featured ? 'border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]' : 'border-[color:var(--border)]'
            }`}
          >
            {plan.is_featured && (
              <Badge tone="accent" className="absolute -top-3 left-6 bg-[color:var(--card)] ring-1 ring-[color:var(--accent)]">
                <Sparkles aria-hidden /> Recomendado
              </Badge>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            {plan.description && <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>}
            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold tabular-nums">{formatPrice(plan.price, plan.currency)}</span>
              <span className="text-sm text-[color:var(--muted-foreground)]">/ {plan.interval === 'year' ? 'año' : 'mes'}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
                  <span>{benefit}</span>
                </li>
              ))}
              <li className="flex gap-2.5 text-[color:var(--muted-foreground)]">
                <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
                <span>
                  {plan.max_concurrent_raffles ? `Hasta ${plan.max_concurrent_raffles} sorteos simultáneos` : 'Sin límite de sorteos simultáneos'}
                </span>
              </li>
            </ul>
            <p className="mt-6 text-xs text-[color:var(--muted-foreground)]">
              Pago manual por período. No hay cobros automáticos: si no renuevas, el plan simplemente termina.
            </p>
            <ButtonLink href={ctaHref} variant={plan.is_featured ? 'primary' : 'secondary'} className="mt-4" block>
              Elegir {plan.name}
            </ButtonLink>
          </article>
        );
      })}
    </div>
  );
}
