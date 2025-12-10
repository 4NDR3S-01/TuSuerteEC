'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

function parseHashParams(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return { accessToken, refreshToken };
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const client = getSupabaseBrowserClient();
        setSupabase(client);

        // Verificar si hay una sesión válida (establecida por el callback)
        // El callback ya procesó el código y estableció la sesión
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        // Verificar que la sesión existe y es válida
        const sessionEstablished = !!sessionData.session;
        
        // Limpiar la URL de parámetros si hay
        if (typeof window !== 'undefined' && sessionEstablished) {
          const url = new URL(window.location.href);
          if (url.searchParams.has('token') || url.searchParams.has('code') || url.hash) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        setHasSession(sessionEstablished);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No pudimos validar tu enlace de recuperación. El enlace puede haber expirado o ya fue usado. Solicita uno nuevo.';
        showToast({
          type: 'error',
          description: message,
        });
        setHasSession(false);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [showToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      showToast({
        type: 'error',
        description: 'Servicio no disponible. Intenta nuevamente en unos minutos.',
      });
      return;
    }

    if (password.length < 8) {
      showToast({
        type: 'error',
        description: 'La contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }

    if (password !== confirmPassword) {
      showToast({
        type: 'error',
        description: 'Las contraseñas no coinciden.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      showToast({
        type: 'success',
        description: 'Tu contraseña se actualizó correctamente. Inicia sesión con tus nuevos datos.',
      });

      setTimeout(() => {
        router.replace('/iniciar-sesion');
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No pudimos actualizar tu contraseña. Intenta nuevamente.';
      showToast({
        type: 'error',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-[color:var(--muted-foreground)]">
        Validando enlace…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-4 text-sm text-[color:var(--muted-foreground)]">
        <p className="font-medium text-[color:var(--foreground)]">Enlace inválido o expirado</p>
        <p>
          El enlace que utilizaste para restablecer tu contraseña ya no es válido. Por seguridad,
          solicita un nuevo correo de recuperación y asegúrate de usarlo en menos de 30 minutos.
        </p>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          onClick={() => router.replace('/recuperar')}
        >
          Solicitar nuevo enlace
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="new-password" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ingresa una nueva contraseña"
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Confirmar contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repite tu nueva contraseña"
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
        />
      </div>
      <button
        type="submit"
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
