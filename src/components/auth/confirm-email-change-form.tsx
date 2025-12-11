'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

type ConfirmEmailChangeFormProps = {
  oldEmail?: string;
  newEmail?: string;
  confirmed?: boolean;
  pending?: boolean;
  completed?: boolean;
  error?: string;
};

export function ConfirmEmailChangeForm({ 
  oldEmail, 
  newEmail, 
  confirmed: initialConfirmed = false,
  pending: initialPending = false,
  completed: initialCompleted = false,
  error: initialError 
}: ConfirmEmailChangeFormProps) {
  const [isValidating, setIsValidating] = useState(!initialConfirmed && !initialError);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [pending, setPending] = useState(initialPending);
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState<string | null>(initialError || null);
  const [emailData, setEmailData] = useState<{ oldEmail?: string; newEmail?: string } | null>(
    oldEmail && newEmail ? { oldEmail, newEmail } : null
  );
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // PRIORIDAD 1: Verificar si ya hay una sesión establecida
        const { data: { user: existingUser }, error: existingError } = await supabase.auth.getUser();
        if (!existingError && existingUser) {
          console.log('[CONFIRM EMAIL CHANGE] ✅ Sesión ya establecida');
          await processUserData(supabase, existingUser);
          setIsValidating(false);
          return;
        }

        // PRIORIDAD 2: Si no hay sesión, intentar procesar token de la URL
        const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
        const token = urlParams.get('token');
        const urlError = urlParams.get('error');
        
        if (urlError) {
          setError(decodeURIComponent(urlError));
          setIsValidating(false);
          return;
        }
        
        if (token) {
          console.log('[CONFIRM EMAIL CHANGE] Procesando token con exchangeCodeForSession...');
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);

            if (!exchangeError && exchangeData?.user) {
              console.log('[CONFIRM EMAIL CHANGE] ✅ Token procesado exitosamente');
              await processUserData(supabase, exchangeData.user);
              // Limpiar URL
              if (globalThis.window) {
                globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
              }
            } else if (exchangeError) {
              console.log('[CONFIRM EMAIL CHANGE] Error procesando token:', exchangeError.message);
              setError(exchangeError.message);
            }
          } catch (error) {
            console.error('[CONFIRM EMAIL CHANGE] Error procesando token:', error);
            setError('Error al procesar el token. El enlace puede haber expirado.');
          }
        } else {
          // No hay token ni sesión
          setError('No hay sesión activa. Por favor, usa el enlace de confirmación que recibiste por correo.');
        }
        
        setIsValidating(false);
      } catch (error) {
        console.error('[CONFIRM EMAIL CHANGE] Error inicializando:', error);
        setError('Error al verificar el estado del cambio. Intenta iniciar sesión para verificar.');
        setIsValidating(false);
      }
    };

    const processUserData = async (supabase: any, user: any) => {
      setIsUserLoggedIn(true);
      setConfirmed(true);

      // Determinar estado del cambio usando user.new_email
      if (user.new_email) {
        // Cambio pendiente: hay un nuevo email esperando confirmación
        setEmailData({ 
          oldEmail: user.email || undefined, 
          newEmail: user.new_email 
        });
        setPending(true);
        setCompleted(false);
      } else {
        // Cambio completado: no hay new_email, el cambio ya se completó
        // Intentar obtener previous_email del perfil para mostrar el correo anterior
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('previous_email')
            .eq('id', user.id)
            .single();
          
          if (profile?.previous_email) {
            setEmailData({ 
              oldEmail: profile.previous_email, 
              newEmail: user.email || undefined
            });
          } else {
            setEmailData({ 
              newEmail: user.email || undefined
            });
          }
        } catch {
          setEmailData({ 
            newEmail: user.email || undefined
          });
        }
        setPending(false);
        setCompleted(true);
      }
    };
    
    void initialize();
  }, []);

  // Refrescar sesión cuando el cambio se completa
  useEffect(() => {
    if (completed && !pending) {
      const refreshSession = async () => {
        try {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.refreshSession();
        } catch (error) {
          console.error('[CONFIRM EMAIL CHANGE] Error refrescando sesión:', error);
        }
      };
      
      const timer = setTimeout(() => {
        void refreshSession();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [completed, pending]);

  if (isValidating) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[color:var(--accent)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Validando cambio de correo...</h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Por favor espera mientras verificamos tu solicitud.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isExpiredError = error.includes('expirado') || error.includes('ya fue usado') || error.includes('inválido') || error.includes('inv?lido');
    const isSessionError = error.includes('sesi?n') || error.includes('session') || error.includes('JWT');
    
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/30 dark:border-red-500/40 bg-red-500/10 dark:bg-red-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            {isSessionError ? 'No hay sesión activa' : 'Error al confirmar el cambio'}
          </h2>
          <p className="text-sm text-red-600/90 dark:text-red-400/90 mb-4">
            {error}
          </p>
          <div className="space-y-3">
            {(isExpiredError || isSessionError) && (
              <div className="rounded-lg border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 p-4 text-left">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">
                  ¿Qué hacer?
                </p>
                <ul className="text-xs text-amber-700/90 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                  {isSessionError ? (
                    <>
                      <li>El enlace puede haber expirado o ya fue usado.</li>
                      <li>Intenta iniciar sesión con tu <strong>nuevo correo electrónico</strong> para verificar si el cambio se completó.</li>
                      <li>Si el cambio está pendiente, confirma ambos correos (anterior y nuevo) para completarlo.</li>
                    </>
                  ) : (
                    <>
                      <li>El enlace puede haber expirado o ya fue usado.</li>
                      <li>Inicia sesión y verifica tu correo en Configuración → Perfil.</li>
                    </>
                  )}
                </ul>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/iniciar-sesion"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (confirmed && emailData) {
    // Si está pendiente, mostrar mensaje de primer correo confirmado
    if (pending && !completed) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-6 text-center">
            <div className="flex justify-center mb-4">
              <Mail className="w-16 h-16 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
              Primer correo confirmado
            </h2>
            <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mb-6">
              Has confirmado este correo correctamente. Para completar el cambio,{' '}
              <strong>debes confirmar también el correo que se envió al otro correo electrónico</strong>.
            </p>
            
            {emailData.oldEmail && emailData.newEmail && emailData.oldEmail !== emailData.newEmail ? (
              <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[color:var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                        Correo anterior:
                      </p>
                      <p className="text-sm font-medium text-[color:var(--foreground)] break-all">
                        {emailData.oldEmail}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[color:var(--border)] pt-3">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                          Nuevo correo:
                        </p>
                        <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                          {emailData.newEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="rounded-lg border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-4 text-left">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
                  💡 Recomendación:
                </p>
                <p className="text-xs text-blue-700/90 dark:text-blue-300/90">
                  Si aún no confirmaste el correo anterior, hazlo primero desde un dispositivo donde <strong>no estés logueado</strong>. Este orden ayuda a evitar problemas con los enlaces.
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span>Revisa tu bandeja de entrada del correo anterior</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                {isUserLoggedIn ? (
                  <Link
                    href="/app"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                  >
                    Ir al dashboard ahora
                  </Link>
                ) : (
                  <Link
                    href="/iniciar-sesion"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                  >
                    Ir a iniciar sesión ahora
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Si está completado, mostrar mensaje de éxito
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-500/30 dark:border-green-500/40 bg-green-500/10 dark:bg-green-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
            ✓ Cambio de correo completado
          </h2>
          <p className="text-sm text-green-600/90 dark:text-green-400/90 mb-4">
            Cambio de correo completado exitosamente. Tu nuevo correo electrónico ya está activo.
          </p>
          
          {emailData?.oldEmail && emailData?.newEmail && emailData.oldEmail !== emailData.newEmail ? (
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[color:var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                      Correo anterior:
                    </p>
                    <p className="text-sm font-medium text-[color:var(--foreground)] break-all">
                      {emailData.oldEmail}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[color:var(--border)] pt-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                        Nuevo correo:
                      </p>
                      <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                        {emailData.newEmail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : emailData?.newEmail ? (
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                    Nuevo correo:
                  </p>
                  <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                    {emailData.newEmail}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Ahora puedes iniciar sesión con tu nuevo correo electrónico{emailData?.newEmail ? `: ${emailData.newEmail}` : ''}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              {isUserLoggedIn ? (
                <Link
                  href="/app"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                >
                  Ir al dashboard ahora
                </Link>
              ) : (
                <Link
                  href="/iniciar-sesion?email_changed=true"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                >
                  Ir a iniciar sesión ahora
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-[color:var(--muted-foreground)]">
        No se pudo procesar la confirmación. Por favor, intenta nuevamente.
      </p>
      <Link
        href="/iniciar-sesion"
        className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
      >
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
