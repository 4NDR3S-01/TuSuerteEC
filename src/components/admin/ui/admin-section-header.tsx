'use client';

import type { ReactNode } from 'react';

type AdminSectionHeaderProps = {
  readonly kicker?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly align?: 'start' | 'center' | 'between';
};

const ALIGN_CLASSES: Record<NonNullable<AdminSectionHeaderProps['align']>, string> = {
  start: 'items-start gap-4',
  center: 'items-center justify-center text-center gap-4',
  between: 'items-center justify-between gap-4',
};

export function AdminSectionHeader({
  kicker,
  title,
  description,
  actions,
  align = 'between',
}: AdminSectionHeaderProps) {
  const alignClasses = ALIGN_CLASSES[align];

  return (
    <header className={`flex flex-col ${alignClasses} sm:flex-row sm:${alignClasses}`}>
      <div className={`flex flex-1 flex-col gap-2 ${align === 'center' ? 'items-center text-center' : ''}`}>
        {kicker ? (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
            {kicker}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{title}</h2>
        {description ? (
          <p className="max-w-3xl text-sm text-[color:var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
