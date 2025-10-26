'use client';

export function ProfileSettings({ user, profile }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[color:var(--foreground)] mb-2">Información Personal</h2>
        <p className="text-[color:var(--muted-foreground)] text-sm">Actualiza tu información de perfil</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Correo Electrónico</label>
          <input type="email" value={user.email} disabled className="w-full px-4 py-3 bg-[color:var(--muted)] border border-[color:var(--border)] rounded-lg text-[color:var(--muted-foreground)]" />
        </div>
        
        <div>
          <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Nombre Completo</label>
          <input type="text" defaultValue={profile?.full_name || ''} className="w-full px-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Teléfono</label>
            <input type="tel" defaultValue={profile?.phone || ''} className="w-full px-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-semibold text-[color:var(--foreground)] block mb-2">Cédula</label>
            <input type="text" defaultValue={profile?.national_id || ''} className="w-full px-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg" />
          </div>
        </div>

        <button className="px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
