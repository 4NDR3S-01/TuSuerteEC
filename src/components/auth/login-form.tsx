'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';
import type { SupabaseClient } from '@supabase/supabase-js';

type FormState = {
  email: string;
  password: string;
};

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps = {}) {
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const { showToast } = useToast();
  const safeRedirectTo =
    redirectTo && redirectTo.startsWith('/') ? redirectTo : undefined;

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
      setError(message);
      showToast({
        type: 'error',
        description: message,
      });
    }
  }, [showToast]);

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || configError) {
      const message = configError ?? 'No se pudo conectar con el servicio de autenticación.';
      setError(message);
      showToast({
        type: 'error',
        description: message,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    const {
      data,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      const mappedError = mapSupabaseError(authError.message);
      setError(mappedError);
      showToast({
        type: 'error',
        description: mappedError,
      });
      setIsLoading(false);
      return;
    }

    if (data.session) {
      showToast({
        type: 'success',
        description: 'Inicio de sesión exitoso. Redirigiendo…',
      });

      // Verificar si el perfil existe
      const { data: profile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, id_number')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Error verificando perfil:', profileCheckError);
      }

      if (!profile && data.user) {
        // El perfil no existe, verificar si la cédula está duplicada
        const userIdNumber = data.user.user_metadata?.id_number;
        
        if (userIdNumber) {
          const { data: duplicateCedula } = await supabase
            .rpc('check_id_number_exists', { id_num: userIdNumber });

          if (duplicateCedula) {
            // Cédula duplicada - Situación ética delicada
            console.error('Usuario sin perfil debido a cédula duplicada:', userIdNumber);
            
            showToast({
              type: 'error',
              description: 'Tu cuenta no se completó correctamente porque la cédula ya está registrada. Contacta a soporte.',
            });
            
            // Cerrar sesión del usuario para evitar acceso sin perfil
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }
        }

        // Si no hay duplicado, crear el perfil
        console.info('Perfil no encontrado, creando desde metadatos del usuario...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || 'Usuario',
            id_number: data.user.user_metadata?.id_number || '0000000000',
            phone_number: data.user.user_metadata?.phone_number || '+593000000000',
            email: data.user.email || '',
            city_id: data.user.user_metadata?.city_id || null,
            parish_id: data.user.user_metadata?.parish_id || null,
            address: data.user.user_metadata?.address || 'Dirección no especificada',
            role: data.user.user_metadata?.role || 'participant',
          });

        if (profileError) {
          console.error('Error creando perfil en login:', profileError);
          
          showToast({
            type: 'error',
            description: 'No se pudo completar tu perfil. Contacta a soporte técnico.',
          });
          
          // Cerrar sesión para evitar estado inconsistente
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
      }

      // Forzar la actualización de cookies en el servidor
      try {
        const response = await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });
  
        if (!response.ok) {
          throw new Error('No se pudo sincronizar tu sesión en el servidor.');
        }
      } catch (syncError) {
        const description =
          syncError instanceof Error
            ? syncError.message
            : 'No se pudo sincronizar tu sesión en el servidor.';
        showToast({
          type: 'error',
          description,
        });
      }

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
            if (data.path && typeof data.path === 'string' && data.path.startsWith('/')) {
              destination = data.path;
            }
          }
        } catch (resolveError) {
          console.error('Error resolving redirect path:', resolveError);
        }
      }

      if (!destination) {
        destination = '/dashboard';
      }

      globalThis.location.href = destination;
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
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange('password')}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 inline-flex items-center justify-center rounded-full p-1.5 text-lg text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <span aria-hidden="true">{showPassword ? '🙈' : '👁️'}</span>
          </button>
        </div>
      </div>
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
