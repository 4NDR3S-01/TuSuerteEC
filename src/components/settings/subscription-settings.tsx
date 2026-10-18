'use client';

import Link from 'next/link';
import { CalendarCheck2, CreditCard } from 'lucide-react';
import { formatDate, formatPrice } from '../../lib/raffle/labels';
import { ButtonLink, Notice } from '../ui/kit';

type Subscription = {
  id: string;
  current_period_end: string;
  plans: { name: string; price: number; interval: string } | null;
};

/** Planes vigentes: se pagan por período y no se renuevan solos, por eso no hay nada que "cancelar" */
export function SubscriptionSettings({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">Plan</h2>
        <p className="text-sm text-[color:var(--muted-foreground)]">Los planes se pagan por período y terminan solos: no hay cobros automáticos que cancelar.</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[color:var(--border)] py-10 text-center">
          <CreditCard className="mx-auto mb-3 size-12 text-[color:var(--muted-foreground)]" aria-hidden />
          <p className="font-semibold">No tienes un plan activo</p>
          <p className="mb-5 mt-1 text-sm text-[color:var(--muted-foreground)]">Con un plan participas automáticamente en los sorteos para suscriptores.</p>
          <ButtonLink href="/app/planes">Ver planes</ButtonLink>
        </div>
      ) : (
        subscriptions.map((subscription) => (
          <div key={subscription.id} className="rounded-2xl border border-[color:var(--border)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{subscription.plans?.name ?? 'Plan'}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[color:var(--muted-foreground)]">
                  <CalendarCheck2 className="size-4" aria-hidden /> Vigente hasta el {formatDate(subscription.current_period_end)}
                </p>
              </div>
              {subscription.plans && (
                <p className="text-right font-bold">
                  {formatPrice(subscription.plans.price)}
                  <span className="block text-xs font-normal text-[color:var(--muted-foreground)]">por {subscription.plans.interval === 'year' ? 'año' : 'mes'}</span>
                </p>
              )}
            </div>
            <Notice tone="neutral" className="mt-4">
              Si quieres seguir participando automáticamente, <Link href="/app/planes" className="font-semibold text-[color:var(--accent)] underline">renueva tu plan</Link> antes de esa fecha. Si no haces nada, el plan termina y no se te cobra.
            </Notice>
          </div>
        ))
      )}
    </div>
  );
}
