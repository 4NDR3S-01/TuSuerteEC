'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { resetPasswordWithToken, verifyPasswordResetToken } from '../../lib/actions/auth';

export function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const token = searchParams.get('token') ?? '';

  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // "hasSession" indica que el enlace de recuperación es válido
  useEffect(() => {
    let isMounted = true;

    verifyPasswordResetToken(token)
      .then((valid) => {
        if (isMounted) setHasSession(valid);
      })
      .catch((error) => {
        console.error('[UPDATE PASSWORD] Error verificando enlace:', error);
        if (isMounted) setHasSession(false);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSession) {
      showToast({
        type: 'error',
        description: 'El enlace no es válido. Solicita uno nuevo desde "Recuperar contraseña".',
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

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      showToast({
        type: 'error',
        description: 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPasswordWithToken(token, password);
      if (!result.success) {
        throw new Error(result.error);
      }

      router.replace('/iniciar-sesion?reason=password_reset');
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
        <div className="h-8 w-8 animate-spin rounded-xl border-4 border-[color:var(--accent)] border-t-transparent" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Verificando enlace de recuperación...
        </p>
      </div>
    );
  }

  if (!hasSession) {
    const error = token ? 'El enlace de recuperación expiró o ya fue usado. Solicita uno nuevo.' : null;
    
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-[color:var(--warning)]/30 bg-[color:var(--warning-soft)] p-6 text-center">
          <p className="mb-2 font-semibold text-[color:var(--foreground)]">
            {error ? 'El enlace expiró o ya fue usado' : 'Enlace no válido'}
          </p>
          <p className="mb-4 text-sm text-[color:var(--muted-foreground)]">
            {error ?? 'Para cambiar tu contraseña usa el enlace de recuperación que generaste desde "Recuperar contraseña".'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              onClick={() => router.replace('/iniciar-sesion')}
            >
              Ir a iniciar sesión
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[color:var(--border)] bg-transparent px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
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
            placeholder="Mínimo 8 caracteres, letras y números"
            className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
            className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
