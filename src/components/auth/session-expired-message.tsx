'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../hooks/use-toast';

export function SessionExpiredMessage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const sessionExpired = searchParams.get('session');
    
    if (sessionExpired === 'expired' && !hasShown) {
      setHasShown(true);
      showToast({
        type: 'warning',
        description: 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.',
      });
      
      // Limpiar el parámetro de la URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('session');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router, showToast, hasShown]);

  return null;
}
