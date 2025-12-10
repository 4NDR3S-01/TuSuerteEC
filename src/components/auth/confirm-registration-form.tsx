'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type ConfirmRegistrationFormProps = {
  confirmed?: boolean;
  error?: string;
};

export function ConfirmRegistrationForm({ 
  confirmed: initialConfirmed = false,
  error: initialError 
}: ConfirmRegistrationFormProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(!initialConfirmed && !initialError);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [error, setError] = useState<string | null>(initialError || null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Si ya está confirmado o hay error, no validar
    if (initialConfirmed || initialError) {
      setIsValidating(false);
      return;
    }

    // Si no hay datos, puede ser que el usuario accedió directamente
    setError('No se encontraron datos de confirmación. El enlace puede haber expirado.');
    setIsValidating(false);
  }, [initialConfirmed, initialError]);

  // Redirigir a login después de 5 segundos si está confirmado
  useEffect(() => {
    if (confirmed && !error) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/iniciar-sesion?confirmed=true');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [confirmed, error, router]);

  if (isValidating) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[color:var(--accent)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Validando confirmación...</h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Por favor espera mientras verificamos tu cuenta.
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
            Error al confirmar tu cuenta
          </h2>
          <p className="text-sm text-red-600/90 dark:text-red-400/90 mb-4">
            {error}
          </p>
          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              El enlace puede haber expirado o ya fue usado. Si necesitas confirmar tu cuenta, 
              solicita un nuevo correo de confirmación.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/iniciar-sesion"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
              >
                Crear nueva cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-500/30 dark:border-green-500/40 bg-green-500/10 dark:bg-green-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
            ✓ ¡Cuenta confirmada exitosamente!
          </h2>
          <p className="text-sm text-green-600/90 dark:text-green-400/90 mb-6">
            Tu correo electrónico ha sido verificado. Ya puedes iniciar sesión y comenzar a participar en nuestros sorteos.
          </p>
          
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[color:var(--foreground)] mb-1">
                  ¿Qué sigue?
                </p>
                <ul className="text-xs text-[color:var(--muted-foreground)] space-y-1 list-disc list-inside">
                  <li>Inicia sesión con tu correo y contraseña</li>
                  <li>Explora los sorteos disponibles</li>
                  <li>Participa y gana increíbles premios</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {countdown > 0 && (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Serás redirigido automáticamente a la página de inicio de sesión en <strong className="text-[color:var(--accent)]">{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...
              </p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/iniciar-sesion?confirmed=true"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Iniciar sesión ahora
                <ArrowRight className="w-4 h-4" />
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
