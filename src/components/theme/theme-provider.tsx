'use client';

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemePreference;
  resolved: ResolvedTheme;
  setMode: Dispatch<SetStateAction<ThemePreference>>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'theme-preference';
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function resolveTheme(mode: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (mode === 'system') {
    return systemDark ? 'dark' : 'light';
  }

  return mode;
}

function applyTheme(mode: ThemePreference, resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.style.setProperty('color-scheme', resolved);
}

type ThemeProviderProps = {
  readonly children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia(COLOR_SCHEME_QUERY);

    const updateResolved = (value: ThemePreference) => {
      const nextResolved = resolveTheme(value, media.matches);
      setResolved(nextResolved);
      applyTheme(value, nextResolved);
    };

    updateResolved(mode);

    const listener = (event: MediaQueryListEvent) => {
      if (mode === 'system') {
        const nextResolved = resolveTheme(mode, event.matches);
        setResolved(nextResolved);
        applyTheme(mode, nextResolved);
      }
    };

    media.addEventListener('change', listener);

    return () => {
      media.removeEventListener('change', listener);
    };
  }, [mode]);

  const setModeAndPersist = useCallback<Dispatch<SetStateAction<ThemePreference>>>(
    (value) => {
      setMode((prev) => {
        const nextValue = typeof value === 'function' ? value(prev) : value;
        window.localStorage.setItem(STORAGE_KEY, nextValue);

        const media = window.matchMedia(COLOR_SCHEME_QUERY);
        const nextResolved = resolveTheme(nextValue, media.matches);
        setResolved(nextResolved);
        applyTheme(nextValue, nextResolved);

        return nextValue;
      });
    },
    [],
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved,
      setMode: setModeAndPersist,
    }),
    [mode, resolved, setModeAndPersist],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
