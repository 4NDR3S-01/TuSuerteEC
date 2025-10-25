'use client';

import type { ReactNode } from 'react';

type AdminCardProps = {
  readonly children: ReactNode;
  readonly padding?: 'sm' | 'md' | 'lg';
  readonly className?: string;
};

const PADDING_MAP = {
  sm: 'p-4 sm:p-5',
  md: 'p-6 sm:p-7',
  lg: 'p-6 sm:p-8',
} as const;

export function AdminCard({ children, padding = 'md', className }: AdminCardProps) {
  const paddingClasses = PADDING_MAP[padding] ?? PADDING_MAP.md;

  return (
    <section
      className={[
        'rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/80 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]',
        paddingClasses,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}
