'use client';

export function SubscriptionSettings({ subscriptions }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[color:var(--foreground)] mb-2">Suscripciones</h2>
        <p className="text-[color:var(--muted-foreground)] text-sm">Gestiona tus planes y métodos de pago</p>
      </div>
      
      {subscriptions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[color:var(--border)] rounded-2xl">
          <span className="text-6xl block mb-4">💳</span>
          <h3 className="text-lg font-bold mb-2">Sin Suscripciones Activas</h3>
          <p className="text-[color:var(--muted-foreground)] text-sm mb-6">Suscríbete para participar automáticamente en todos los sorteos</p>
          <a href="/app/planes" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-lg font-semibold">
            Ver Planes Disponibles
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub: any) => (
            <div key={sub.id} className="p-6 border-2 border-[color:var(--border)] rounded-xl hover:border-[color:var(--accent)]/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[color:var(--foreground)]">{sub.plans.name}</h3>
                  <p className="text-sm text-[color:var(--muted-foreground)]">Renovación: {new Date(sub.current_period_end).toLocaleDateString('es-EC')}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[color:var(--accent)]">${sub.plans.price}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)]">/{sub.plans.interval}</div>
                </div>
              </div>
              <button className="text-sm font-semibold text-red-600 hover:text-red-700">Cancelar Suscripción</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
