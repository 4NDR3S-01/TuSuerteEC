'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isProcessing: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

type AuthProviderProps = {
  readonly children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      setUser(session?.user ?? null);
      setError(null);
    } catch (sessionError) {
      console.error('Error getting initial session:', sessionError);
      setUser(null);
      setError('No pudimos validar tu sesión. Inicia sesión nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setError(null);
          // Solo refrescar si no estamos ya en una página protegida
          // Para evitar conflictos durante la redirección después del login
          if (pathname && !pathname.startsWith('/app') && !pathname.startsWith('/administrador') && !pathname.startsWith('/staff')) {
            router.refresh();
          }
        }

        if (event === 'SIGNED_OUT') {
          setError(null);
          setUser(null);
          setLoading(false);
          // Si estamos en una ruta protegida, redirigir a login
          // Pero solo si no estamos ya en una página pública
          if (pathname && 
              !pathname.includes('/iniciar-sesion') && 
              !pathname.includes('/registro') && 
              !pathname.includes('/recuperar') &&
              !pathname.includes('/restablecer-clave') &&
              (pathname.startsWith('/app') || pathname.startsWith('/administrador') || pathname.startsWith('/staff'))) {
            // Usar replace sin parámetros para evitar problemas con RSC
            router.replace('/iniciar-sesion');
          }
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, refreshSession, router, supabase]);

  const signOut = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Primero cerrar sesión en el cliente
      const { error: clientError } = await supabase.auth.signOut();
      if (clientError) {
        throw clientError;
      }

      // Luego cerrar sesión en el servidor
      try {
        const response = await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // No lanzar error si falla el servidor, ya cerramos en el cliente
          console.warn('Failed to sign out on server, but client session cleared');
        }
      } catch (serverError) {
        // Ignorar errores del servidor, la sesión del cliente ya está cerrada
        console.warn('Server sign-out error (non-critical):', serverError);
      }

      // Limpiar el estado inmediatamente
      setUser(null);
      setLoading(false);
      
      showToast({
        type: 'success',
        description: 'Sesión cerrada correctamente.',
      });
      
      // Redirigir usando replace sin parámetros para evitar problemas con RSC
      router.replace('/iniciar-sesion');
    } catch (signOutError) {
      console.error('Error signing out:', signOutError);
      const description =
        signOutError instanceof Error
          ? signOutError.message
          : 'No pudimos cerrar tu sesión. Intenta nuevamente.';
      setError(description);
      showToast({
        type: 'error',
        description,
      });
      setIsProcessing(false);
    }
  }, [router, showToast, supabase]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isProcessing,
      error,
      refreshSession,
      signOut,
    }),
    [user, loading, isProcessing, error, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
