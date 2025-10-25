'use client';

type AdminMetricCardProps = {
  readonly title: string;
  readonly description?: string;
  readonly value: number | string;
  readonly icon?: string;
  readonly accentFrom?: string;
  readonly accentTo?: string;
  readonly valuePrefix?: string;
  readonly valueSuffix?: string;
};

export function AdminMetricCard({
  title,
  description,
  value,
  icon,
  accentFrom = 'from-blue-500/20',
  accentTo = 'to-blue-500/5',
  valuePrefix,
  valueSuffix,
}: AdminMetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/80 p-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)]">
      <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${accentFrom} ${accentTo}`} aria-hidden />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--background)] text-xl">
              {icon}
            </span>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              {title}
            </p>
            {description ? (
              <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p>
            ) : null}
          </div>
        </div>
        <p className="text-3xl font-semibold text-[color:var(--foreground)]">
          {valuePrefix}
          {typeof value === 'number' ? value.toLocaleString() : value}
          {valueSuffix}
        </p>
      </div>
    </div>
  );
}
