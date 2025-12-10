'use client';

import { useSessionTimeout } from '../../hooks/use-session-timeout';

export function SessionTimeoutProvider() {
  useSessionTimeout();
  return null;
}
