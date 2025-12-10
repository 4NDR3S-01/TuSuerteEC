'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '../lib/supabase/client';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos

export function useSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = () => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Solo cerrar sesión si realmente ha pasado el tiempo de inactividad
      // y no estamos ya en una página pública
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && !pathname?.includes('/iniciar-sesion')) {
        try {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.signOut();
          
          // Redirigir a login con mensaje
          router.push('/iniciar-sesion?session=expired');
        } catch (error) {
          console.error('Error cerrando sesión por inactividad:', error);
        }
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimeout();
    };

    // Agregar listeners para todos los eventos de actividad
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar el timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router, pathname]);

  return null;
}
