'use client';

import type { ReactNode } from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { AppSidebar } from './app-sidebar';
import { SidebarContext } from '../../hooks/use-sidebar';
import { SessionTimeoutProvider } from '../auth/session-timeout-provider';

type AppShellProps = {
  readonly children: ReactNode;
  readonly subtitle?: string;
  readonly subscription?: {
    planName: string;
    renewalDate: string;
  } | null;
};

export function AppShell({ children, subscription }: AppShellProps) {
  const { user, loading, isProcessing, signOut, error } = useAuth({ required: true });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const sidebarContextValue = useMemo(
    () => ({ isCollapsed, setIsCollapsed }),
    [isCollapsed]
  );

  // Asegurar que el componente esté montado antes de renderizar
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-[color:var(--muted-foreground)]">
        <span className="animate-pulse text-sm font-medium">Validando sesión…</span>
      </div>
    );
  }

  if (!user && !loading) {
    // El hook useAuth ya maneja la redirección, solo mostrar el mensaje
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-[color:var(--muted-foreground)]">
        <span className="animate-pulse text-sm font-medium">Redirigiendo al inicio de sesión…</span>
      </div>
    );
  }

  if (!user) {
    // Si no hay usuario después de cargar, no renderizar nada
    return null;
  }

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <SessionTimeoutProvider />
      <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
        {/* Sidebar */}
        <AppSidebar 
          user={user} 
          subscription={subscription} 
          onSignOut={() => void signOut()}
          isProcessing={isProcessing}
        />
        
        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-h-screen w-full lg:w-auto transition-all duration-300 ${isCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100 border-b border-red-200 dark:border-red-900">
              <div className="mx-auto max-w-7xl px-4 py-3 text-sm sm:px-6 lg:px-8 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        
          {/* Main Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
