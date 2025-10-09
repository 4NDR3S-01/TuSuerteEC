import type { ReactNode } from "react";

type PrizesShowcaseProps = {
  kicker: ReactNode;
  title: ReactNode;
  description: ReactNode;
};

export function RafflesShowcase({
  kicker,
  title,
  description,
}: Readonly<PrizesShowcaseProps>) {
  return (
    <section id="sorteos" className="scroll-mt-header space-y-8 sm:space-y-10">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          {kicker}
        </span>
        <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{title}</h2>
        <p className="max-w-3xl text-sm text-[color:var(--muted-foreground)] sm:text-base">{description}</p>
      </div>
    </section>
  );
}
