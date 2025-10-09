'use client';

interface WinnersShowcaseProps {
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
  readonly items?: any[]; // Replace 'any' with a more specific type if available
}

export function WinnersShowcase({ kicker, title, description, items = [] }: WinnersShowcaseProps) {
  return (
    <section id="ganadores" className="scroll-mt-header space-y-8 sm:space-y-10">
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
