'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const client = getSupabaseBrowserClient();
        setSupabase(client);

        // Verificar parámetros de la URL para code_processed
        const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
        const codeProcessed = urlParams.get('code_processed') === 'true';
        const verifyOnly = urlParams.get('verify_only') === 'true';
        const hash = globalThis.window?.location.hash || '';
        
        // Si code_processed=true, intentar procesar el código desde el hash antes de verificar sesión
        if (codeProcessed && hash) {
          console.log('[UPDATE PASSWORD] code_processed=true - intentando procesar código desde hash...');
          try {
            // Intentar extraer el código del hash
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const code = hashParams.get('code');
            
            // Si hay código en el hash, intentar intercambiarlo por sesión
            if (code) {
              console.log('[UPDATE PASSWORD] Código encontrado en hash - intercambiando por sesión...');
              const { data: exchangeData, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
              
              if (!exchangeError && exchangeData?.session) {
                console.log('[UPDATE PASSWORD] ✅ Sesión establecida desde código del hash');
                setHasSession(true);
                setIsLoading(false);
                // Limpiar hash de la URL
                if (globalThis.window) {
                  globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname + '?token=valid');
                }
                return;
              } else if (exchangeError) {
                console.log('[UPDATE PASSWORD] Error intercambiando código:', exchangeError.message);
                // Continuar con verificación de sesión normal
              }
            } else if (accessToken && refreshToken) {
              // Si hay tokens en el hash, intentar establecer sesión directamente
              console.log('[UPDATE PASSWORD] Tokens encontrados en hash - estableciendo sesión...');
              const { data: sessionData, error: tokenError } = await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (!tokenError && sessionData?.session) {
                console.log('[UPDATE PASSWORD] ✅ Sesión establecida desde tokens del hash');
                setHasSession(true);
                setIsLoading(false);
                // Limpiar hash de la URL
                if (globalThis.window) {
                  globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname + '?token=valid');
                }
                return;
              } else if (tokenError) {
                console.log('[UPDATE PASSWORD] Error estableciendo sesión desde tokens:', tokenError.message);
                // Continuar con verificación de sesión normal
              }
            }
          } catch (hashError) {
            console.error('[UPDATE PASSWORD] Error procesando hash:', hashError);
            // Continuar con verificación de sesión normal
          }
        }

        // Verificar si hay una sesión válida (establecida por el callback)
        // El callback ya procesó el código y estableció la sesión
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        if (sessionError && !codeProcessed && !verifyOnly) {
          throw sessionError;
        }

        // Verificar que la sesión existe y es válida
        const sessionEstablished = !!sessionData.session;
        
        // Si code_processed=true pero no hay sesión, NO mostrar error - el código puede haberse procesado
        if (!sessionEstablished && codeProcessed) {
          console.log('[UPDATE PASSWORD] code_processed=true pero no hay sesión - código puede haberse procesado, verificando...');
          // Intentar obtener usuario directamente (puede funcionar con sesión temporal)
          const { data: userData, error: userError } = await client.auth.getUser();
          
          if (!userError && userData?.user) {
            console.log('[UPDATE PASSWORD] ✅ Usuario obtenido sin sesión persistente - código procesado');
            // Si podemos obtener el usuario, asumir que el código fue procesado
            // Establecer hasSession como true para permitir cambiar contraseña
            setHasSession(true);
            setIsLoading(false);
            return;
          }
        }
        
        // Limpiar la URL de parámetros si hay
        if (globalThis.window && sessionEstablished) {
          const url = new URL(globalThis.window.location.href);
          if (url.searchParams.has('token') || url.searchParams.has('code') || url.hash) {
            globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
          }
        }

        setHasSession(sessionEstablished);
      } catch (error) {
        // Solo mostrar error si NO es code_processed
        const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
        const codeProcessed = urlParams.get('code_processed') === 'true';
        const verifyOnly = urlParams.get('verify_only') === 'true';
        
        if (!codeProcessed && !verifyOnly) {
          const message =
            error instanceof Error
              ? error.message
              : 'No pudimos validar tu enlace de recuperación. El enlace puede haber expirado o ya fue usado. Solicita uno nuevo.';
          showToast({
            type: 'error',
            description: message,
          });
        } else {
          console.log('[UPDATE PASSWORD] code_processed/verify_only=true - NO mostrando error, código puede haberse procesado');
        }
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
    // Verificar si code_processed=true - en ese caso, mostrar mensaje diferente
    const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
    const codeProcessed = urlParams.get('code_processed') === 'true';
    const verifyOnly = urlParams.get('verify_only') === 'true';
    const hash = globalThis.window?.location.hash || '';
    const hashHasError = hash.includes('error=');
    
    // Si code_processed=true, el código fue procesado pero no hay sesión persistente
    // Mostrar mensaje informativo en lugar de error
    if (codeProcessed || verifyOnly) {
      return (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-6 text-center">
            <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">
              {hashHasError 
                ? 'El enlace puede haber expirado, pero estamos verificando...'
                : 'Verificando enlace de recuperación...'
              }
            </p>
            <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mb-4">
              {hashHasError
                ? 'Aunque el enlace puede haber expirado, es posible que el proceso se haya completado. Por favor, intenta iniciar sesión con tu nueva contraseña si ya la estableciste.'
                : 'Estamos verificando si el enlace de recuperación es válido. Por favor espera...'
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
                className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
                onClick={() => router.replace('/recuperar')}
              >
                Solicitar nuevo enlace
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Si no es code_processed, mostrar error normal
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
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa una nueva contraseña"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 inline-flex items-center justify-center rounded-full p-1.5 text-lg text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <span aria-hidden="true">{showPassword ? <EyeOff /> : <Eye />}</span>
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
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite tu nueva contraseña"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 inline-flex items-center justify-center rounded-full p-1.5 text-lg text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
            aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
          >
            <span aria-hidden="true">{showConfirmPassword ? <EyeOff /> : <Eye />}</span>
          </button>
        </div>
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
