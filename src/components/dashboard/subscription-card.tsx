'use client';

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  plans?: {
    name: string;
    price: number;
  };
}

interface SubscriptionCardProps {
  readonly subscriptions: Subscription[];
}

export function SubscriptionCard({ subscriptions }: SubscriptionCardProps) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Mis Suscripciones</h2>
          <span className="text-2xl">💳</span>
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-[color:var(--muted-foreground)] text-sm">No tienes suscripciones activas</p>
          <button className="mt-4 px-4 py-2 bg-[color:var(--accent)] text-[color:var(--accent-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Ver Planes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Mis Suscripciones</h2>
        <span className="text-2xl">💳</span>
      </div>
      <div className="space-y-4">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between p-4 bg-[color:var(--muted)] rounded-lg border border-[color:var(--border)] hover:border-[color:var(--accent)] transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-[color:var(--foreground)]">
                  {sub.plans?.name || 'Plan Desconocido'}
                </h3>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                  Activa
                </span>
              </div>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Renueva el: {new Date(sub.current_period_end).toLocaleDateString('es-EC', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            {Boolean(sub.plans?.price) && (
              <div className="text-right">
                <p className="text-lg font-bold text-[color:var(--accent)]">${sub.plans.price}</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">/mes</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}