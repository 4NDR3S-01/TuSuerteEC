'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';
import { getSupabaseBrowserClient as getSupabaseClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

export function UpdatePasswordForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const client = getSupabaseClient();
        setSupabase(client);

        // Verificar si ya hay una sesión establecida
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData?.session) {
          setHasSession(true);
          setIsLoading(false);
          return;
        }

        // Si no hay sesión, buscar código en la URL
        const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
        const code = urlParams.get('code');
        
        if (!code) {
          setHasSession(false);
          setIsLoading(false);
          return;
        }

        // Verificar si el código es un UUID (token de recovery de Supabase)
        // Los UUIDs son tokens de recovery que deben verificarse con verifyOtp
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
        
        if (isUUID) {
          // Para tokens UUID de recovery, usar verifyOtp para establecer la sesión
          console.log('[UPDATE PASSWORD] Procesando token UUID de recovery con verifyOtp...');
          const { data: verifyData, error: verifyError } = await client.auth.verifyOtp({
            token: code,
            type: 'recovery',
          });

          if (!verifyError && verifyData?.session) {
            // Éxito: sesión establecida
            console.log('[UPDATE PASSWORD] ✅ Token de recovery verificado - sesión establecida');
            setHasSession(true);
            // Limpiar URL
            if (globalThis.window) {
              globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
            }
            setIsLoading(false);
            return;
          }

          // Si verifyOtp falla, verificar si la sesión se estableció de todas formas
          if (verifyError) {
            console.error('[UPDATE PASSWORD] Error verificando token:', verifyError.message);
            // A veces Supabase establece la sesión aunque haya un error
            const { data: sessionCheck } = await client.auth.getSession();
            if (sessionCheck?.session) {
              console.log('[UPDATE PASSWORD] ✅ Sesión encontrada después del error');
              setHasSession(true);
              if (globalThis.window) {
                globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
              }
              setIsLoading(false);
              return;
            }
          }

          // Si no hay sesión, mostrar error
          setHasSession(false);
          setIsLoading(false);
          return;
        }

        // Si NO es un UUID, es un código PKCE válido
        // Intentar procesar el código con exchangeCodeForSession
        const { data: exchangeData, error: exchangeError } = await client.auth.exchangeCodeForSession(code);

        if (!exchangeError && exchangeData?.session) {
          // Éxito: sesión establecida
          setHasSession(true);
          // Limpiar URL
          if (globalThis.window) {
            globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
          }
          setIsLoading(false);
          return;
        }

        // Si falla, verificar sesión de todas formas (por si Supabase la estableció)
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: finalSession } = await client.auth.getSession();
        if (finalSession?.session) {
          setHasSession(true);
          if (globalThis.window) {
            globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
          }
        } else {
          setHasSession(false);
        }
      } catch (error) {
        console.error('[UPDATE PASSWORD] Error inicializando:', error);
        setHasSession(false);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !hasSession) {
      showToast({
        type: 'error',
        description: 'No hay sesión activa. Por favor, usa el enlace de recuperación que recibiste por correo.',
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

    if (password.length < 8) {
      showToast({
        type: 'error',
        description: 'La contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // updateUser funcionará porque verifyOtp estableció un contexto de recovery
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
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--accent)] border-t-transparent" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Verificando enlace de recuperación...
        </p>
      </div>
    );
  }

  if (!hasSession) {
    // Verificar si hay un error en la URL
    const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
    const error = urlParams.get('error');
    
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-6 text-center">
          <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">
            {error ? 'El enlace expiró o ya fue usado' : 'No hay sesión activa'}
          </p>
          <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mb-4">
            {error
              ? decodeURIComponent(error)
              : 'Por favor, usa el enlace de recuperación que recibiste por correo. El enlace puede haber expirado o ya fue usado.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              onClick={() => router.replace('/iniciar-sesion')}
            >
              Ir a iniciar sesión
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-transparent px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
              onClick={() => router.replace('/recuperar')}
            >
              Solicitar nuevo enlace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="new-password" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-password" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la contraseña"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting || !supabase}
      >
        {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
