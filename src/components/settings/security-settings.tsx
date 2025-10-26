'use client';

export function SecuritySettings({ user }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[color:var(--foreground)] mb-2">Seguridad</h2>
        <p className="text-[color:var(--muted-foreground)] text-sm">Gestiona tu contraseña y configuración de seguridad</p>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">Cambiar Contraseña</h3>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-1">Tu contraseña debe tener al menos 8 caracteres</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Contraseña Actual</label>
          <input type="password" className="w-full px-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg" />
        </div>

        <div>
          <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Nueva Contraseña</label>
          <input type="password" className="w-full px-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg" />
        </div>

        <div>
          <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Confirmar Nueva Contraseña</label>
          <input type="password" className="w-full px-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg" />
        </div>

        <button className="px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
          Actualizar Contraseña
        </button>
      </div>
    </div>
  );
}
