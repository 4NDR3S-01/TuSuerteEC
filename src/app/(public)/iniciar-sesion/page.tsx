import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "../../../components/auth/login-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";
import { getCurrentUser } from "../../../lib/auth/get-user";
import { SessionExpiredMessage } from "../../../components/auth/session-expired-message";

type LoginPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Si el usuario ya está autenticado, redirigir al dashboard
  const user = await getCurrentUser();
  if (user) {
    redirect('/app');
  }

  const params = await searchParams;
  const redirectTo =
    typeof params?.redirectTo === "string" && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : undefined;
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader
        navItems={PUBLIC_NAV_ITEMS}
        cta={{ href: "/registro", label: "Crear cuenta" }}
      />

      <main className="relative flex w-full min-h-screen items-center justify-center px-4 pb-12 pt-12 text-base sm:px-6 sm:pb-20 sm:pt-16">
        <div className="absolute inset-x-0 top-0 -z-10 hidden h-[420px] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18)_0%,_transparent_55%)] sm:block" />

        <AuthPageLayout
          badge="Bienvenido de vuelta"
          title="Ingresa y continúa participando por premios increíbles."
          description="Recupera el control de tus sorteos, revisa tus boletos activos y consulta los resultados más recientes desde cualquier dispositivo."
          highlights={[
            "Accede a tu panel personal y revisa tus participaciones.",
            "Activa recordatorios para no perderte ningún sorteo.",
            "Gestiona tus métodos de pago y suscripciones.",
          ]}
          callout={
            <>
              ¿Necesitas ayuda con tu cuenta? Escríbenos a{" "}
              <a href="mailto:soporte@tusuerte.com" className="font-semibold text-[color:var(--accent)]">
                soporte@tusuerte.com
              </a>{" "}
              y nuestro equipo te asistirá en minutos.
            </>
          }
          rightColumnClassName="items-center justify-center"
        >
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/96 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-2xl sm:p-8">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold">Inicia sesión</h2>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Ingresa tus credenciales para continuar con tu experiencia en TuSuerte.
              </p>
            </div>
            <Suspense fallback={null}>
              <SessionExpiredMessage />
            </Suspense>
            <div className="mt-6">
              <LoginForm redirectTo={redirectTo} />
            </div>
            <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.08)] p-5 text-xs text-[color:var(--muted-foreground)] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
              <p>
                ¿Olvidaste tu contraseña?{" "}
                <Link href="/recuperar" className="font-semibold text-[color:var(--accent)]">
                  Recuperar acceso
                </Link>
              </p>
              <p>
                ¿Aún no tienes cuenta?{" "}
                <Link href="/registro" className="font-semibold text-[color:var(--accent)]">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>
        </AuthPageLayout>
      </main>
    </div>
  );
}
