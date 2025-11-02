import Link from "next/link";

import { RegisterForm } from "../../../components/auth/register-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader
        navItems={PUBLIC_NAV_ITEMS}
        cta={{ href: "/iniciar-sesion", label: "Iniciar sesión" }}
      />

      <main className="relative flex w-full min-h-screen items-center justify-center px-4 pb-20 pt-14 text-base sm:px-6 sm:pb-24 sm:pt-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18)_0%,_transparent_55%)]" />

        <AuthPageLayout
          badge="Únete a TuSuerte"
          title="Crea tu cuenta y participa en nuestros sorteos."
          description="Regístrate en menos de un minuto y comienza a ganar premios increíbles participando en nuestros sorteos."
          highlights={[
            "Accede a sorteos exclusivos para miembros.",
            "Recibe notificaciones de nuevos sorteos y resultados.",
            "Gestiona tus participaciones desde tu panel personal.",
          ]}
          callout={
            <>
              ¿Ya tienes cuenta?{" "}
              <Link href="/iniciar-sesion" className="font-semibold text-[color:var(--accent)]">
                Inicia sesión aquí.
              </Link>
            </>
          }
          rightColumnClassName="gap-10 px-8 lg:px-12"
        >
          <div className="mx-auto w-full max-w-2xl space-y-8">
            <RegisterForm containerClassName="mx-auto w-full max-w-[42rem] border-[color:var(--border)] bg-[color:var(--background)]/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />

            <div className="mx-auto w-full space-y-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.08)] p-5 text-xs text-[color:var(--muted-foreground)] md:flex md:items-center md:gap-6 md:space-y-0">
              <p className="md:max-w-sm">
                Al registrarte aceptas nuestros{" "}
                <Link href="#" className="font-semibold text-[color:var(--accent)]">
                  términos y condiciones
                </Link>{" "}
                y{" "}
                <Link href="#" className="font-semibold text-[color:var(--accent)]">
                  políticas de privacidad
                </Link>
                .
              </p>
              <p className="font-semibold text-[color:var(--accent)]">Revisa tu correo para activar la cuenta.</p>
            </div>
          </div>
        </AuthPageLayout>
      </main>
    </div>
  );
}
