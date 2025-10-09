export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] px-4 py-10 sm:px-8 md:px-16"
      style={{ background: "var(--hero-gradient)" }}
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <span
            className="inline-flex max-w-max items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] sm:px-4"
            style={{ backgroundColor: "rgba(249, 115, 22, 0.12)", color: "var(--accent)" }}
          >
            Sorteos verificados en vivo
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Toda la experiencia de TuSuerte en un solo lugar.
          </h1>
          <p className="max-w-2xl text-base text-[color:var(--muted-foreground)] sm:text-lg">
            Publicamos premios activos, ganadores históricos y reportes auditados en tiempo real.
            Inicia sesión con tu correo y, según tu rol, entrarás al dashboard correspondiente para
            gestionar o participar en los sorteos.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <a
              href="#planes"
              className="rounded-full px-5 py-3 text-sm font-semibold shadow-lg shadow-[color:rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-6 sm:text-base"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
            >
              Ver planes
            </a>
            <a
              href="/login"
              className="rounded-full px-5 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid var(--border)",
              }}
            >
              Inicia sesión
            </a>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:gap-6 md:grid-cols-4">
            {[
              { value: "+120K", label: "Usuarios activos" },
              { value: "98%", label: "Nivel de satisfacción" },
              { value: "24/7", label: "Soporte humano" },
              { value: "$1.2M", label: "Premios entregados" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-semibold sm:text-2xl">{stat.value}</p>
                <p className="text-xs text-[color:var(--muted-foreground)] sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(255,255,255,0.24)] p-5 backdrop-blur sm:p-6 md:p-10">
          <div className="space-y-4">
            <h2 className="text-base font-semibold sm:text-lg">Unimos marketing con emoción</h2>
            <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
              <li>• Segmentamos campañas con datos en tiempo real para maximizar conversiones.</li>
              <li>• Diseñamos una experiencia gamificada que retiene y fideliza a tus clientes.</li>
              <li>• Reportes claros en cada etapa para medir impacto y ROI.</li>
            </ul>
            <p className="text-sm font-medium text-[color:var(--accent)]">
              “La plataforma más efectiva que hemos usado para activar a nuestra comunidad.”
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">— Equipo de Marketing, BrandX</p>
          </div>
        </div>
      </div>
    </section>
  );
}
