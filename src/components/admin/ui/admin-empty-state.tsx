'use client';

import Link from 'next/link';

type AdminEmptyStateProps = {
  readonly title: string;
  readonly description?: string;
  readonly icon?: string;
  readonly action?: {
    label: string;
    href: string;
  };
};

export function AdminEmptyState({ title, description, icon, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/20 px-6 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
      {icon ? (
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
      ) : null}
      <p className="text-base font-semibold text-[color:var(--foreground)]">{title}</p>
      {description ? <p className="max-w-xs">{description}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
