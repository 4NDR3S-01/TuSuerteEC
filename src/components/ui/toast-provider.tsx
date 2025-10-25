'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastType = 'info' | 'success' | 'error';

export type ToastOptions = {
  title?: string;
  description: string;
  type?: ToastType;
  duration?: number;
};

type ToastRecord = ToastOptions & {
  id: string;
  createdAt: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
};

const DEFAULT_DURATION = 4000;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function generateId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [clearTimer]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = generateId();
      const toast: ToastRecord = {
        id,
        createdAt: Date.now(),
        ...options,
      };

      setToasts((prev) => [...prev, toast]);

      const duration = options.duration ?? DEFAULT_DURATION;
      if (Number.isFinite(duration) && duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[9999] mx-auto flex max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6 sm:left-auto sm:w-80">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur transition-all duration-300 ${
              toast.type === 'error'
                ? 'border-red-500/40 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-950/80 dark:text-red-100'
                : toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-100'
                : 'border-[color:var(--border)] bg-[color:var(--muted)]/90 text-[color:var(--foreground)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
                <p className="text-sm leading-relaxed">{toast.description}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-xs opacity-70 transition-opacity hover:opacity-100"
              >
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Cerrar notificación</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
