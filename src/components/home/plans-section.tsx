type PlansSectionProps = {
  plans?: any[]; // Replace 'any' with your actual plan type if available
};

export function PlansSection({ plans = [] }: Readonly<PlansSectionProps>) {
  return (
    <section id="planes" className="scroll-mt-header space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Planes TuSuerte
          </span>
          <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Define tus paquetes y upsells</h2>
          <p className="max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
            Crea planes personalizados para cada tipo de cliente y publícalos en segundos desde el
            panel. Puedes activar o pausar planes, ajustar precios y sumar beneficios exclusivos.
          </p>
        </div>
      </div>
    </section>
  );
}
