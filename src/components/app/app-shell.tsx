'use client';

import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { SessionTimeoutProvider } from '../auth/session-timeout-provider';
import { ParticipantPanel } from '../ops/panels';

type AppShellProps = {
  readonly children: ReactNode;
  readonly subscription?: { planName: string; renewalDate: string } | null;
};

/** Estructura del área del participante (misma base visual que los paneles del equipo) */
export function AppShell({ children, subscription = null }: AppShellProps) {
  // Si la sesión se pierde en el navegador, redirige al inicio de sesión
  useAuth({ required: true });
  return (
    <>
      <SessionTimeoutProvider />
      <ParticipantPanel subscription={subscription}>{children}</ParticipantPanel>
    </>
  );
}
