import Link from "next/link";
import { LoginForm } from "../../../components/auth/login-form";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";

export default function LoginPage() {
  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <SiteHeader
        navItems={PUBLIC_NAV_ITEMS}
        cta={{ href: "/#inicio", label: "Volver al inicio" }}
      />
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-4 pb-20 pt-14 text-base sm:px-6 sm:pb-24 sm:pt-16 md:gap-16 md:px-10">
        <section className="grid gap-10 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.55)] sm:p-8 md:grid-cols-[1.1fr_1fr] md:p-10">
          <div className="space-y-6">
            <span className="inline-flex max-w-max items-center rounded-full bg-[rgba(249,115,22,0.12)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
              TuSuerte haciendo magia
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Ingresa para participar por los premios.
              </h1>
            </div>
            <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
              <li>• Participa por los premios increíbles.</li>
              <li>• Acceso a contenido exclusivo y promociones especiales.</li>
              <li>• Soporte dedicado para resolver tus dudas.</li>
            </ul>
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.08)] p-5 text-sm text-[color:var(--muted-foreground)]">
              ¿Tienes problemas con tu acceso? Puedes pedir ayuda escribiendo a{" "}
              <a href="mailto:soporte@tusuerte.com" className="font-medium text-[color:var(--accent)]">
                soporte@tusuerte.com.
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-inner">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold">Inicia Sesión</h2>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Ingresa tus datos para participar por los premios.
              </p>
            </div>
            <LoginForm />
            <div className="space-y-2 text-center text-xs text-[color:var(--muted-foreground)]">
              <p>
                ¿Olvidaste tu contraseña?{" "}
                <Link href="/recuperar" className="font-semibold text-[color:var(--accent)]">
                  Recuperar acceso
                </Link>
              </p>
              <p>
                ¿Necesitas una cuenta?{" "}
                <Link href="/registro" className="font-semibold text-[color:var(--accent)]">
                  Contacta a soporte
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
