import Link from "next/link";

import { ResetPasswordForm } from "../../../components/auth/reset-password-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";

export default function RecoverPage() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader
        navItems={PUBLIC_NAV_ITEMS}
        cta={{ href: "/registro", label: "Crear cuenta" }}
      />

      <main className="relative flex w-full min-h-screen items-center justify-center px-4 pb-12 pt-12 text-base sm:px-6 sm:pb-20 sm:pt-16">
        <div className="absolute inset-x-0 top-0 -z-10 hidden h-[420px] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18)_0%,_transparent_55%)] sm:block" />

        <AuthPageLayout
          badge="¿Olvidaste tu contraseña?"
          title="Recupera el acceso a tu cuenta en minutos."
          description="Enviaremos un enlace seguro para que puedas crear una nueva contraseña. Revisa tu bandeja de entrada y sigue las instrucciones."
          highlights={[
            "El enlace tiene una validez limitada por seguridad.",
            "Si no encuentras el correo, revisa tu carpeta de spam o promociones.",
            "Recuerda actualizar tu contraseña con una combinación segura.",
          ]}
          callout={
            <>
              ¿Necesitas asistencia adicional? Escríbenos a{" "}
              <a href="mailto:soporte@tusuerte.com" className="font-semibold text-[color:var(--accent)]">
                soporte@tusuerte.com
              </a>{" "}
              y nuestro equipo te ayudará a restablecer el acceso.
            </>
          }
          rightColumnClassName="items-center justify-center"
        >
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/96 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-2xl sm:p-8">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold">Recuperar contraseña</h2>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>
            <div className="mt-6">
              <ResetPasswordForm />
            </div>
            <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.08)] p-5 text-xs text-[color:var(--muted-foreground)] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
              <p>
                ¿Recordaste tu contraseña?{" "}
                <Link href="/iniciar-sesion" className="font-semibold text-[color:var(--accent)]">
                  Volver a iniciar sesión
                </Link>
              </p>
              <p>
                ¿Necesitas una cuenta?{" "}
                <Link href="/registro" className="font-semibold text-[color:var(--accent)]">
                  Crea una ahora
                </Link>
              </p>
            </div>
          </div>
        </AuthPageLayout>
      </main>
    </div>
  );
}
