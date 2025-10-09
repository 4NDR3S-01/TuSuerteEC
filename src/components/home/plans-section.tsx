const PLANS = [
  {
    name: "Plan Lanzamiento",
    status: "Editable en el panel",
    summary: "Perfecto para marcas que debutan con sorteos digitales.",
    benefits: [
      "Hasta 3 sorteos simultáneos con automatización básica.",
      "Landing pages preconfiguradas y plantillas de email.",
      "Reportes esenciales: participaciones, leads y conversiones.",
    ],
  },
  {
    name: "Plan Escala",
    status: "Editable en el panel",
    summary: "Optimiza campañas en crecimiento con analítica avanzada.",
    benefits: [
      "Segmentación por audiencias y triggers en tiempo real.",
      "Integraciones con CRM y píxeles publicitarios.",
      "Soporte premium y asesor marketing dedicado.",
    ],
  },
  {
    name: "Plan Corporativo",
    status: "Editable en el panel",
    summary: "Diseñado para brands que buscan experiencias memorables.",
    benefits: [
      "Sorteos ilimitados con flujos multicanal.",
      "Branding white-label y roles de equipo personalizados.",
      "Auditoría legal y certificaciones incluidas.",
    ],
  },
] as const;

export function PlansSection() {
  return (
    <section id="planes" className="space-y-8 sm:space-y-10">
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
        <a href="#ayuda" className="text-sm font-semibold transition-colors hover:text-[color:var(--accent)]">
          Ver guía de configuración →
        </a>
      </div>
      <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className="flex flex-col gap-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)]"
          >
            <div className="space-y-2">
              <h3 className="text-xl font-semibold sm:text-2xl">{plan.name}</h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                {plan.status}
              </p>
              <p className="text-sm text-[color:var(--muted-foreground)]">{plan.summary}</p>
            </div>
            <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
              {plan.benefits.map((benefit) => (
                <li key={benefit}>• {benefit}</li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-auto w-max rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide opacity-80 transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
              disabled
            >
              Editar desde panel
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
