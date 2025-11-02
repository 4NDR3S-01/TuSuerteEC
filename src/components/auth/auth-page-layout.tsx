import type { ReactNode } from "react";

interface AuthPageLayoutProps {
  readonly badge: string;
  readonly title: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly callout?: ReactNode;
  readonly children: ReactNode;
  readonly rightColumnClassName?: string;
}

export function AuthPageLayout({
  badge,
  title,
  description,
  highlights,
  callout,
  children,
  rightColumnClassName,
}: AuthPageLayoutProps) {
  const rightColumnClasses = [
    "flex w-full flex-col items-stretch justify-center gap-6 bg-[color:var(--background)]/95 px-4 py-6 sm:px-6 sm:py-8 lg:px-12",
    rightColumnClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="mx-auto grid w-full max-w-[min(100%,80rem)] grid-cols-1 overflow-hidden rounded-4xl border border-[color:var(--border)] bg-[color:var(--muted)]/80 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.65)] backdrop-blur-lg lg:grid-cols-[0.75fr_1.25fr]">
      <div className="hidden flex-col justify-between gap-8 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12)_0%,_transparent_70%)] px-6 py-10 sm:px-8 lg:flex lg:px-10">
        <div className="space-y-6">
          <span className="inline-flex max-w-max items-center rounded-full bg-[rgba(249,115,22,0.12)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
            {badge}
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{title}</h1>
            <p className="text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
          </div>
          <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[color:var(--accent)]/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {callout ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.10)] p-5 text-sm text-[color:var(--muted-foreground)]">
            {callout}
          </div>
        ) : null}
      </div>

      <div className={rightColumnClasses}>
        <div className="space-y-3 lg:hidden">
          <details className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/25 px-4 py-3 text-left">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
              Ver detalles de la experiencia
            </summary>
            <div className="mt-3 space-y-3">
              <span className="inline-flex items-center rounded-full bg-[rgba(249,115,22,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
                {badge}
              </span>
              <h1 className="text-xl font-semibold text-[color:var(--foreground)]">{title}</h1>
              <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p>
              {highlights.length > 0 ? (
                <ul className="space-y-2 text-xs text-[color:var(--muted-foreground)]">
                  {highlights.map((item) => (
                    <li key={`m-${item}`} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {callout ? (
                <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.10)] px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
                  {callout}
                </div>
              ) : null}
            </div>
          </details>
        </div>
        <div className="mx-auto w-full max-w-lg lg:max-w-none">{children}</div>
      </div>
    </section>
  );
}
