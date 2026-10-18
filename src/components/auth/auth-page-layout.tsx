import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

interface AuthPageLayoutProps {
  readonly badge: string;
  readonly title: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly callout?: ReactNode;
  readonly children: ReactNode;
  /** Ancho del formulario */
  readonly wide?: boolean;
}

/** Diseño de dos columnas para las páginas de acceso: mensaje a la izquierda, formulario a la derecha */
export function AuthPageLayout({ badge, title, description, highlights, callout, children, wide = false }: AuthPageLayoutProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
      <div className="hidden overflow-hidden rounded-3xl p-10 text-white lg:sticky lg:top-24 lg:block" style={{ background: "var(--hero-gradient)" }}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">{badge}</p>
        <h1 className="mt-4 text-3xl font-bold leading-tight">{title}</h1>
        <p className="mt-3 text-sm text-white/75">{description}</p>
        <ul className="mt-8 space-y-4 text-sm">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-orange-300" aria-hidden />
              <span className="text-white/90">{item}</span>
            </li>
          ))}
        </ul>
        {callout ? <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/80">{callout}</div> : null}
      </div>

      <div className={`mx-auto w-full ${wide ? "max-w-2xl" : "max-w-md"} lg:max-w-none`}>
        <div className="mb-6 lg:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">{badge}</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </section>
  );
}
