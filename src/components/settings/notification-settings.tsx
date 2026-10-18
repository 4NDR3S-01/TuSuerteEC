'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { getMyNotificationPreferences, updateMyNotificationPreferences, type NotificationPreferences } from '../../lib/actions/profile';
import { useToast } from '../../hooks/use-toast';
import { Button, Notice } from '../ui/kit';

const DEFAULTS: NotificationPreferences = { email_raffles: true, email_winners: true, email_subscription: true, email_marketing: false };

/**
 * Preferencias de comunicación. Los avisos sobre pagos, boletos y premios llegan siempre dentro de la app
 * (son parte del servicio); las comunicaciones promocionales requieren consentimiento expreso (LOPDP).
 */
export function NotificationSettings() {
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyNotificationPreferences()
      .then((value) => value && setPreferences({ ...DEFAULTS, ...value }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const result = await updateMyNotificationPreferences(preferences);
    setSaving(false);
    showToast(result.success ? { type: 'success', description: 'Preferencias guardadas.' } : { type: 'error', description: result.error ?? 'No se pudo guardar.' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">Avisos y comunicaciones</h2>
        <p className="text-sm text-[color:var(--muted-foreground)]">Decide qué mensajes quieres recibir.</p>
      </div>

      <Notice tone="info" icon={Bell}>
        Los avisos sobre tus pagos, boletos, resultados y premios aparecen siempre en la campana de notificaciones de tu cuenta.
      </Notice>

      {loading ? (
        <Loader2 className="size-5 animate-spin text-[color:var(--muted-foreground)]" aria-label="Cargando" />
      ) : (
        <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--border)] p-4">
          <input
            type="checkbox"
            checked={preferences.email_marketing}
            onChange={(event) => setPreferences((prev) => ({ ...prev, email_marketing: event.target.checked }))}
            className="mt-1 size-4 accent-[color:var(--accent)]"
          />
          <span>
            <span className="block font-semibold">Promociones y nuevos sorteos por correo</span>
            <span className="text-sm text-[color:var(--muted-foreground)]">
              Acepto recibir correos sobre nuevos sorteos y promociones. Puedo retirar este consentimiento cuando quiera desde aquí.
            </span>
          </span>
        </label>
      )}

      <Button onClick={save} disabled={saving || loading}>
        {saving && <Loader2 className="animate-spin" aria-hidden />} Guardar preferencias
      </Button>
    </div>
  );
}
