'use client';

import { useMemo, type ReactElement } from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';

const MODES: Array<{ value: 'light' | 'dark'; label: string; icon: ReactElement }> = [
  { value: 'light', label: 'Claro', icon: <Sun /> },
  { value: 'dark', label: 'Oscuro', icon: <Moon /> },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const orderedModes = useMemo(() => MODES, []);
  const currentIndex = orderedModes.findIndex((option) => option.value === mode);
  const nextIndex = (currentIndex + 1) % orderedModes.length;

  return (
    <>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] text-lg shadow-sm transition-transform hover:-translate-y-0.5"
        onClick={() => setMode(orderedModes[nextIndex].value)}
        aria-label={`Cambiar tema. Modo actual: ${orderedModes[currentIndex]?.label ?? mode}`}
      >
        <span aria-hidden="true">{orderedModes[currentIndex]?.icon ?? <Sun />}</span>
      </button>
    </>
  );
}
