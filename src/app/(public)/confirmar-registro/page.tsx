import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";
import { ConfirmRegistrationForm } from "../../../components/auth/confirm-registration-form";
import { getCurrentUser } from "../../../lib/auth/get-user";

export const dynamic = 'force-dynamic';

type ConfirmRegistrationPageProps = {
  searchParams?: Promise<{
    confirmed?: string;
    error?: string;
  }>;
};

export default async function ConfirmRegistrationPage({ searchParams }: ConfirmRegistrationPageProps) {
  // Si el usuario ya está autenticado, redirigir al dashboard
  const user = await getCurrentUser();
  if (user) {
    redirect('/app');
  }

  const params = await searchParams;
  const confirmed = params?.confirmed === 'true';
  const error = params?.error;

  // Si no hay parámetros necesarios y no está confirmado, redirigir
  if (!confirmed && !error) {
    redirect('/iniciar-sesion');
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader
        navItems={PUBLIC_NAV_ITEMS}
        cta={{ href: "/registro", label: "Crear cuenta" }}
      />

      <main className="relative flex w-full min-h-screen items-center justify-center px-4 pb-12 pt-12 text-base sm:px-6 sm:pb-20 sm:pt-16">
        <div className="absolute inset-x-0 top-0 -z-10 hidden h-[420px] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18)_0%,_transparent_55%)] sm:block" />

        <AuthPageLayout
          badge="Confirmación de registro"
          title="¡Bienvenido a TuSuerte!"
          description="Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión y comenzar a participar en nuestros sorteos."
          highlights={[
            "Tu correo electrónico ha sido confirmado.",
            "Ahora puedes iniciar sesión con tus credenciales.",
            "Explora todos los sorteos disponibles y comienza a ganar.",
          ]}
          rightColumnClassName="items-center justify-center"
        >
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/96 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-2xl sm:p-8">
            <Suspense fallback={
              <div className="flex min-h-[200px] items-center justify-center text-sm text-[color:var(--muted-foreground)]">
                Cargando...
              </div>
            }>
              <ConfirmRegistrationForm 
                confirmed={confirmed}
                error={error}
              />
            </Suspense>
          </div>
        </AuthPageLayout>
      </main>
    </div>
  );
}
