'use client';

import { useToastContext } from '../components/ui/toast-provider';

export function useToast() {
  const { showToast, dismissToast } = useToastContext();
  return { showToast, dismissToast };
}
