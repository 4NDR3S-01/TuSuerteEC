'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck2, Check, Clock, Sparkles } from 'lucide-react';
import ManualSubscriptionModal from '../payments/manual-subscription-modal';
import type { PaymentMethod } from '../../lib/payments/types';
import { formatDate, formatPrice } from '../../lib/raffle/labels';
import { Badge, Button, Card, Notice, SectionHeader } from '../ui/kit';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  benefits: unknown;
  is_featured: boolean;
  max_concurrent_raffles: number | null;
};

type Props = {
  plans: Plan[];
  activeSubscription: { planId: string | null; planName: string; periodEnd: string } | null;
  hasPendingRequest: boolean;
  paymentMethods: PaymentMethod[];
};

export function PlansPage({ plans, activeSubscription, hasPendingRequest, paymentMethods }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <SectionHeader as="h1" title="Planes" description="Con un plan activo participas automáticamente en los sorteos para suscriptores. Se paga por período y no se renueva solo." />

      {activeSubscription && (
        <Notice tone="success" icon={CalendarCheck2} title={`Tu plan ${activeSubscription.planName} está activo`}>
          Vigente hasta el {formatDate(activeSubscription.periodEnd)}. Puedes renovarlo antes de que termine y el nuevo período empezará al final del actual.
        </Notice>
      )}
      {hasPendingRequest && (
        <Notice tone="warning" icon={Clock} title="Tienes una solicitud en revisión">
          Te avisaremos cuando verifiquemos tu pago. Mientras tanto no puedes enviar otra solicitud de plan.
        </Notice>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const benefits = Array.isArray(plan.benefits) ? (plan.benefits as string[]) : [];
          const isCurrent = activeSubscription?.planId === plan.id;
          return (
            <Card key={plan.id} className={`relative flex flex-col p-6 ${plan.is_featured ? 'ring-2 ring-[color:var(--accent)]' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">{plan.name}</h2>
                {isCurrent ? <Badge tone="success">Tu plan</Badge> : plan.is_featured ? <Badge tone="accent"><Sparkles aria-hidden /> Recomendado</Badge> : null}
              </div>
              {plan.description && <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>}
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold tabular-nums">{formatPrice(plan.price, plan.currency)}</span>
                <span className="text-sm text-[color:var(--muted-foreground)]">/ {plan.interval === 'year' ? 'año' : 'mes'}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden /> {benefit}</li>
                ))}
                <li className="flex gap-2 text-[color:var(--muted-foreground)]">
                  <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
                  {plan.max_concurrent_raffles ? `Hasta ${plan.max_concurrent_raffles} sorteos a la vez` : 'Sin límite de sorteos simultáneos'}
                </li>
              </ul>
              <Button
                className="mt-6"
                block
                variant={plan.is_featured || isCurrent ? 'primary' : 'secondary'}
                disabled={hasPendingRequest}
                onClick={() => setSelected(plan)}
              >
                {isCurrent ? 'Renovar' : activeSubscription ? 'Cambiar a este plan' : 'Suscribirme'}
              </Button>
              {activeSubscription && !isCurrent && (
                <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Al aprobarse, reemplaza tu plan actual desde ese momento.</p>
              )}
            </Card>
          );
        })}
      </div>

      {selected && (
        <ManualSubscriptionModal
          plan={selected}
          isRenewal={activeSubscription?.planId === selected.id}
          paymentMethods={paymentMethods}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
