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
            TuSuerte | Sorteos en vivo
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            La plataforma de sorteos <span className="whitespace-nowrap">más confiable</span>
          </h1>
          <p className="max-w-2xl text-base text-[color:var(--muted-foreground)] sm:text-lg">
            Impulsa la participación y fideliza a tu comunidad con sorteos transparentes y seguros. ¡Participa
            en tu primer sorteo hoy mismo! 
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
              { value: "+$1.2M", label: "Premios entregados" },
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
            <h2 className="text-2xl font-semibold sm:text-3xl">¿Por qué elegir TuSuerte?</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              TuSuerte utiliza tecnología avanzada para ofrecer una experiencia óptima en sorteos. Siendo una plataforma intuitiva y fácil de usar, facilitando la participación en los sorteos.
            </p>
            <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
              <li>• Somos una plataforma 100% transparente.</li>
              <li>• Ofrecemos premios atractivos para incentivar la participación.</li>
              <li>• Garantizamos la seguridad de tus datos y los de tus participantes.</li>
            </ul>
            <p className="text-sm font-medium text-[color:var(--accent)]">
              ¡Únete a miles de usuarios satisfechos y comienza a ganar hoy mismo!
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">— Equipo de TuSuerte</p>
          </div>
        </div>
      </div>
    </section>
  );
}
