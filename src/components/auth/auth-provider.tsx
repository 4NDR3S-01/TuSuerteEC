'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { useToast } from '../../hooks/use-toast';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  fullName: string;
};

type AuthContextType = {
  user: AuthUser | null;
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
  return (
    <SessionProvider>
      <AuthStateProvider>{children}</AuthStateProvider>
    </SessionProvider>
  );
}

function AuthStateProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: session, status, update } = useSession();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user?.id) return null;
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      role: session.user.role ?? 'participant',
      fullName: session.user.name ?? '',
    };
  }, [session]);

  const refreshSession = useCallback(async () => {
    await update();
  }, [update]);

  const signOut = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await nextAuthSignOut({ redirect: false });

      showToast({
        type: 'success',
        description: 'Sesión cerrada correctamente.',
      });

      router.replace('/iniciar-sesion');
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
  }, [router, showToast]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading: status === 'loading',
      isProcessing,
      error,
      refreshSession,
      signOut,
    }),
    [user, status, isProcessing, error, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
