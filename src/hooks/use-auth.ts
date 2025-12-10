'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '../components/auth/auth-provider';

type UseAuthOptions = {
  required?: boolean;
  redirectTo?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const auth = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const { required = false, redirectTo } = options ?? {};

  useEffect(() => {
    if (!required || auth.loading) {
      return;
    }

    if (!auth.user) {
      // Solo redirigir si no estamos ya en una página pública
      if (pathname && 
          !pathname.includes('/iniciar-sesion') && 
          !pathname.includes('/registro') && 
          !pathname.includes('/recuperar') &&
          !pathname.includes('/restablecer-clave')) {
        // Redirigir sin parámetros para evitar problemas con RSC
        // El middleware manejará el redirectTo si es necesario
        router.replace('/iniciar-sesion');
      }
    }
  }, [auth.loading, auth.user, pathname, redirectTo, required, router]);

  return auth;
}
