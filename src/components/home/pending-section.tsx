type PendingItem = {
  title: string;
  subtitle?: string;
  status: string;
  description: string;
  actionLabel?: string;
};

type PendingSectionProps = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  items: PendingItem[];
  badgeNote?: string;
  appearance?: "gradient" | "muted";
};

export function PendingSection({
  id,
  kicker,
  title,
  description,
  items,
  badgeNote,
  appearance = "gradient",
}: PendingSectionProps) {
  return (
    <section id={id} className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            {kicker}
          </span>
          <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{title}</h2>
          <p className="max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
        </div>
        {badgeNote ? (
          <span className="text-xs font-semibold text-[color:var(--muted-foreground)] sm:text-sm">
            {badgeNote}
          </span>
        ) : null}
      </div>
      <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className={`flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] p-6 transition-transform hover:-translate-y-1 ${
              appearance === "gradient" ? "shadow-[0_20px_60px_-40px_rgba(249,115,22,0.35)]" : "shadow-[0_20px_50px_-35px_rgba(15,23,42,0.55)]"
            }`}
            style={{
              background:
                appearance === "gradient"
                  ? "var(--card-gradient)"
                  : "var(--muted)",
            }}
          >
            <div className="flex flex-col gap-2">
              {item.subtitle ? (
                <span className="text-sm font-medium uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
                  {item.subtitle}
                </span>
              ) : null}
              <h3 className="text-xl font-semibold sm:text-2xl">{item.title}</h3>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              {item.status}
            </p>
            <p className="text-sm text-[color:var(--muted-foreground)]">{item.description}</p>
            {item.actionLabel ? (
              <button
                type="button"
                className="mt-auto w-max rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide opacity-70"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
                disabled
              >
                {item.actionLabel}
              </button>
            ) : (
              <div className="mt-auto h-2 w-full rounded-full bg-[color:var(--border)]">
                <span className="block h-2 w-1/3 rounded-full bg-[color:var(--accent)] opacity-60" />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
