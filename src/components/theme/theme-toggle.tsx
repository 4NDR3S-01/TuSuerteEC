'use client';

import { useMemo } from 'react';
import { useTheme } from './theme-provider';

const MODES: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'system', label: 'Sistema', icon: '🌓' },
  { value: 'dark', label: 'Oscuro', icon: '🌙' },
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] text-lg shadow-sm transition-transform hover:-translate-y-0.5 sm:hidden"
        onClick={() => setMode(orderedModes[nextIndex].value)}
        aria-label={`Cambiar tema. Modo actual: ${orderedModes[currentIndex]?.label ?? mode}`}
      >
        <span aria-hidden="true">{orderedModes[currentIndex]?.icon ?? '🌓'}</span>
      </button>
      <div className="hidden items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] p-1 text-xs font-medium shadow-sm sm:flex">
        {orderedModes.map((option) => {
          const isActive = option.value === mode;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'var(--accent-foreground)' : 'var(--foreground)',
              }}
              aria-pressed={isActive}
            >
              <span aria-hidden="true">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
