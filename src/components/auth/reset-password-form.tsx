'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { getEmailAuthRedirectUrl } from '../../lib/utils/get-base-url';

export function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const client = getSupabaseBrowserClient();
      setSupabase(client);
    } catch (clientError) {
      const message =
        clientError instanceof Error ? clientError.message : 'No se pudo inicializar Supabase.';
      setConfigError(message);
      showToast({
        type: 'error',
        description: message,
      });
    }
  }, [showToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || configError) {
      const message = configError ?? 'Servicio de recuperación no disponible en este momento.';
      showToast({
        type: 'error',
        description: message,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Para recovery, apuntar directamente a la página de restablecimiento
      // Esto permite que Supabase maneje el hash automáticamente
      const redirectTo = getEmailAuthRedirectUrl('/restablecer-clave');

      console.log('[RESET PASSWORD] Enviando email con redirectTo:', redirectTo);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      showToast({
        type: 'success',
        description: 'Te enviamos un correo con el enlace para restablecer tu contraseña.',
      });
      setEmail('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No pudimos enviar el enlace de recuperación. Intenta más tarde.';
      showToast({
        type: 'error',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="recovery-email" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Correo electrónico
        </label>
        <input
          id="recovery-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
        />
      </div>

      <button
        type="submit"
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoading || !supabase || !!configError}
      >
        {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
      </button>

    </form>
  );
}
