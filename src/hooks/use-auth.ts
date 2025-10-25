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
      const redirectTarget =
        redirectTo ?? `/iniciar-sesion?redirectTo=${encodeURIComponent(pathname)}`;
      router.replace(redirectTarget);
    }
  }, [auth.loading, auth.user, pathname, redirectTo, required, router]);

  return auth;
}
