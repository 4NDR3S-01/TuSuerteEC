'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useToast } from '../../hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { safeInternalPath } from '../../lib/auth/roles';
import { Button, Field, Input, Notice } from '../ui/kit';

type FormState = {
  email: string;
  password: string;
};

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps = {}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const safeRedirectTo = safeInternalPath(redirectTo);
  // Hasta hidratar, el envío nativo haría un GET y perdería los datos: el botón espera
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (!result || result.error) {
      setError(mapAuthError(result?.code));
      setIsLoading(false);
      return;
    }

    showToast({
      type: 'success',
      description: 'Inicio de sesión exitoso. Redirigiendo…',
    });

    let destination = safeRedirectTo;

    if (!destination) {
      try {
        const response = await fetch('/api/auth/resolve-redirect', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data: { path?: string } = await response.json();
          destination = safeInternalPath(data.path) ?? destination;
        }
      } catch (resolveError) {
        console.error('Error resolving redirect path:', resolveError);
      }
    }

    router.push(destination ?? '/app');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} method="post" className="flex w-full flex-col gap-4">
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Correo electrónico" htmlFor="email" required>
        <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange('email')} />
      </Field>
      <Field label="Contraseña" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange('password')}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-2 my-auto flex size-9 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" block disabled={isLoading || !ready} className="mt-2">
        {isLoading && <Loader2 className="animate-spin" aria-hidden />}
        {isLoading ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  );
}

function mapAuthError(code: string | undefined): string {
  if (code === 'invalid_credentials') {
    return 'Credenciales inválidas. Verifica tu correo y contraseña.';
  }

  if (code === 'missing_profile') {
    return 'Tu cuenta no tiene un perfil completo. Contacta a soporte.';
  }

  if (code === 'account_suspended') {
    return 'Tu cuenta está suspendida. Si crees que es un error, contáctanos.';
  }

  if (code === 'too_many_attempts') {
    return 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.';
  }

  return 'No pudimos iniciar sesión. Intenta nuevamente en unos minutos.';
}
