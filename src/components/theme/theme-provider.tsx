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

type ThemePreference = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemePreference;
  setMode: Dispatch<SetStateAction<ThemePreference>>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'theme-preference';
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function applyTheme(mode: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.themeMode = mode;
  root.style.setProperty('color-scheme', mode);
}

type ThemeProviderProps = {
  readonly children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemePreference>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
      setModeState(stored);
      return;
    }

    const media = window.matchMedia(COLOR_SCHEME_QUERY);
    const preferred = media.matches ? 'dark' : 'light';
    applyTheme(preferred);
    setModeState(preferred);

    const listener = (event: MediaQueryListEvent) => {
      const persisted = window.localStorage.getItem(STORAGE_KEY);
      if (persisted !== 'light' && persisted !== 'dark') {
        const nextMode = event.matches ? 'dark' : 'light';
        applyTheme(nextMode);
        setModeState(nextMode);
      }
    };

    media.addEventListener('change', listener);

    return () => {
      media.removeEventListener('change', listener);
    };
  }, []);

  const setModeAndPersist = useCallback<Dispatch<SetStateAction<ThemePreference>>>(
    (value) => {
      setModeState((prev) => {
        const nextValue = typeof value === 'function' ? value(prev) : value;
        window.localStorage.setItem(STORAGE_KEY, nextValue);
        applyTheme(nextValue);
        return nextValue;
      });
    },
    [],
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode: setModeAndPersist,
    }),
    [mode, setModeAndPersist],
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
