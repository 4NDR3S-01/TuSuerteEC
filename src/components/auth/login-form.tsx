'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type FormState = {
  email: string;
  password: string;
};

export function LoginForm() {
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const client = getSupabaseBrowserClient();
      setSupabase(client);
    } catch (clientError) {
      const message =
        clientError instanceof Error
          ? clientError.message
          : 'No se pudo inicializar Supabase.';
      setConfigError(message);
    }
  }, []);

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || configError) {
      setError(configError ?? 'No se pudo conectar con el servicio de autenticación.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const {
      data,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError(mapSupabaseError(authError.message));
      setIsLoading(false);
      return;
    }

    if (data.session) {
      setSuccess(true);
      router.replace('/dashboard');
      router.refresh();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={handleChange('email')}
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          placeholder="tu@correo.com"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-[color:var(--foreground)]">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={handleChange('password')}
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          placeholder="••••••••"
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300">
          {error}
        </p>
      ) : null}
      {configError ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200">
          {configError}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200">
          Inicio de sesión exitoso. Redirigiendo...
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoading || !!configError || !supabase}
      >
        {isLoading ? 'Iniciando...' : 'Ingresar'}
      </button>
    </form>
  );
}

function mapSupabaseError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Credenciales inválidas. Verifica tu correo y contraseña.';
  }

  if (/email not confirmed/i.test(message)) {
    return 'Debes confirmar tu correo electrónico antes de ingresar.';
  }

  return 'No pudimos iniciar sesión. Intenta nuevamente en unos minutos.';
}
