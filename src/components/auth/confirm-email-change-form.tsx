'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

type ConfirmEmailChangeFormProps = {
  oldEmail?: string;
  newEmail?: string;
  confirmed?: boolean;
  error?: string;
};

export function ConfirmEmailChangeForm({ 
  oldEmail, 
  newEmail, 
  confirmed: initialConfirmed = false,
  error: initialError 
}: ConfirmEmailChangeFormProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(!initialConfirmed && !initialError);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
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
      
      if (urlOldEmail && urlNewEmail) {
        setEmailData({ oldEmail: urlOldEmail, newEmail: urlNewEmail });
        setConfirmed(true);
        setIsValidating(false);
      } else {
        // Si no hay datos, mostrar error
        setError('No se encontraron los datos del cambio de correo. El enlace puede haber expirado.');
        setIsValidating(false);
      }
    }
  }, [initialConfirmed, initialError, emailData]);

  // Redirigir a login después de 5 segundos si está confirmado
  useEffect(() => {
    if (confirmed && !error) {
      const timer = setTimeout(() => {
        router.push('/iniciar-sesion?email_changed=true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmed, error, router]);

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
