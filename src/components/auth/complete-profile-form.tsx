'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProfile } from '../../lib/auth/create-profile';
import type { User } from '@supabase/supabase-js';

type CompleteProfileFormProps = {
  user: User;
};

export function CompleteProfileForm({ user }: CompleteProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: user.user_metadata?.full_name || '',
    idNumber: user.user_metadata?.id_number || '',
    phone: user.user_metadata?.phone_number?.replace('+593', '') || '',
    address: user.user_metadata?.address || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await createUserProfile({
        userId: user.id,
        fullName: form.fullName,
        idNumber: form.idNumber,
        phoneNumber: `+593${form.phone}`,
        email: user.email || '',
        address: form.address,
        role: 'participant'
      });

      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Error al crear el perfil');
      }
    } catch (err) {
      setError('Error inesperado al crear el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[color:var(--foreground)]">
            Completar Perfil
          </h2>
          <p className="mt-2 text-center text-sm text-[color:var(--muted-foreground)]">
            Necesitamos completar tu información para continuar
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[color:var(--foreground)]">
                Nombre Completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[color:var(--border)] placeholder-[color:var(--muted-foreground)] text-[color:var(--foreground)] rounded-md focus:outline-none focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] focus:z-10 sm:text-sm"
                placeholder="Tu nombre completo"
              />
            </div>
            
            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium text-[color:var(--foreground)]">
                Número de Cédula
              </label>
              <input
                id="idNumber"
                name="idNumber"
                type="text"
                required
                value={form.idNumber}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[color:var(--border)] placeholder-[color:var(--muted-foreground)] text-[color:var(--foreground)] rounded-md focus:outline-none focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] focus:z-10 sm:text-sm"
                placeholder="1234567890"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[color:var(--foreground)]">
                Teléfono
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-sm">
                  +593
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleInputChange}
                  className="flex-1 appearance-none relative block w-full px-3 py-2 border border-[color:var(--border)] placeholder-[color:var(--muted-foreground)] text-[color:var(--foreground)] rounded-r-md focus:outline-none focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] sm:text-sm"
                  placeholder="987654321"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-[color:var(--foreground)]">
                Dirección
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={form.address}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[color:var(--border)] placeholder-[color:var(--muted-foreground)] text-[color:var(--foreground)] rounded-md focus:outline-none focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] focus:z-10 sm:text-sm"
                placeholder="Tu dirección completa"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
                          {error ? (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : null}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-[color:var(--accent-foreground)] bg-[color:var(--accent)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Completando...' : 'Completar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
