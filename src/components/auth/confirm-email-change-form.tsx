'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

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
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(!initialConfirmed && !initialError);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [pending, setPending] = useState(initialPending);
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState<string | null>(initialError || null);
  const [emailData, setEmailData] = useState<{ oldEmail?: string; newEmail?: string } | null>(
    oldEmail && newEmail ? { oldEmail, newEmail } : null
  );

  useEffect(() => {
    // Si ya está confirmado o hay error, no validar
    if (initialConfirmed || initialError) {
      setIsValidating(false);
      return;
    }

    // Si no hay datos de email, intentar obtenerlos de la URL
    if (!emailData) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOldEmail = urlParams.get('oldEmail');
      const urlNewEmail = urlParams.get('newEmail');
      const urlPending = urlParams.get('pending') === 'true';
      const urlCompleted = urlParams.get('completed') === 'true';
      
      if (urlOldEmail && urlNewEmail) {
        setEmailData({ oldEmail: urlOldEmail, newEmail: urlNewEmail });
        setConfirmed(true);
        setPending(urlPending);
        setCompleted(urlCompleted);
        setIsValidating(false);
      } else {
        // Si no hay datos, mostrar error
        setError('No se encontraron los datos del cambio de correo. El enlace puede haber expirado.');
        setIsValidating(false);
      }
    }
  }, [initialConfirmed, initialError, emailData]);

  // Redirigir a login después de 5 segundos si está confirmado y completado
  // Si está pendiente, no redirigir automáticamente
  useEffect(() => {
    if (confirmed && completed && !error && !pending) {
      const timer = setTimeout(() => {
        router.push('/iniciar-sesion?email_changed=true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmed, completed, error, pending, router]);

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
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/30 dark:border-red-500/40 bg-red-500/10 dark:bg-red-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Error al confirmar el cambio
          </h2>
          <p className="text-sm text-red-600/90 dark:text-red-400/90 mb-4">
            {error}
          </p>
          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              El enlace puede haber expirado o ya fue usado. Si necesitas cambiar tu correo, 
              ve a la configuración de tu cuenta y solicita un nuevo cambio.
            </p>
            <div className="flex gap-3 justify-center">
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
    // Si está pendiente, mostrar mensaje diferente
    if (pending && !completed) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-6 text-center">
            <div className="flex justify-center mb-4">
              <Mail className="w-16 h-16 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
              ✓ Primer correo confirmado
            </h2>
            <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mb-6">
              Has confirmado tu nuevo correo electrónico. Para completar el cambio, debes confirmar también el correo que se envió a tu dirección anterior.
            </p>
            
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                      Nuevo correo (confirmado):
                    </p>
                    <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                      {emailData.newEmail}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[color:var(--border)] pt-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[color:var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                        Correo anterior (pendiente):
                      </p>
                      <p className="text-sm font-medium text-[color:var(--foreground)] break-all">
                        {emailData.oldEmail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 p-4">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-2">
                  📬 Próximo paso:
                </p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/90">
                  Revisa tu bandeja de entrada del correo <strong>{emailData.oldEmail}</strong> y haz clic en el enlace de confirmación que se envió allí. Ambos correos deben ser confirmados para completar el cambio.
                </p>
              </div>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Puedes cerrar esta página. El cambio se completará cuando confirmes el otro correo.
              </p>
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
            ✓ Cambio de correo confirmado
          </h2>
          <p className="text-sm text-green-600/90 dark:text-green-400/90 mb-6">
            Tu correo electrónico ha sido actualizado exitosamente.
          </p>
          
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

          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Serás redirigido automáticamente a la página de inicio de sesión en unos segundos.
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Ahora puedes iniciar sesión con tu nuevo correo electrónico: <strong className="text-[color:var(--foreground)]">{emailData.newEmail}</strong>
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/iniciar-sesion?email_changed=true"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesión ahora
              </Link>
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
