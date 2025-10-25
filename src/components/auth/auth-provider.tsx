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
          router.refresh();
        }

        if (event === 'SIGNED_OUT') {
          setError(null);
          if (pathname !== '/iniciar-sesion') {
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
      const { error: clientError } = await supabase.auth.signOut();
      if (clientError) {
        throw clientError;
      }

      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to sign out on server');
      }

      showToast({
        type: 'success',
        description: 'Sesión cerrada correctamente.',
      });
      router.refresh();
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
    } finally {
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
