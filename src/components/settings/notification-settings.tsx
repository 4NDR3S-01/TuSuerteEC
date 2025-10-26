'use client';

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[color:var(--foreground)] mb-2">Notificaciones</h2>
        <p className="text-[color:var(--muted-foreground)] text-sm">Configura cómo quieres recibir actualizaciones</p>
      </div>
      
      <div className="space-y-4">
        {[
          { id: 'email_raffles', label: 'Nuevos Sorteos', description: 'Recibe un email cuando se publiquen nuevos sorteos' },
          { id: 'email_winners', label: 'Resultados de Sorteos', description: 'Notificaciones cuando ganes un sorteo' },
          { id: 'email_subscription', label: 'Suscripción', description: 'Renovaciones y cambios en tu plan' },
          { id: 'email_marketing', label: 'Promociones', description: 'Ofertas especiales y contenido exclusivo' },
        ].map((item) => (
          <div key={item.id} className="flex items-start justify-between p-4 border border-[color:var(--border)] rounded-lg hover:bg-[color:var(--muted)]/30 transition-all">
            <div className="flex-1">
              <h3 className="font-semibold text-[color:var(--foreground)]">{item.label}</h3>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-1">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-[color:var(--muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]"></div>
            </label>
          </div>
        ))}
      </div>

      <button className="px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
        Guardar Preferencias
      </button>
    </div>
  );
}
