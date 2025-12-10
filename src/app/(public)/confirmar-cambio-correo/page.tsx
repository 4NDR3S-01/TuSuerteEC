import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";
import { ConfirmEmailChangeForm } from "../../../components/auth/confirm-email-change-form";

export const dynamic = 'force-dynamic';

type ConfirmEmailChangePageProps = {
  searchParams?: Promise<{
    oldEmail?: string;
    newEmail?: string;
    confirmed?: string;
    error?: string;
  }>;
};

export default async function ConfirmEmailChangePage({ searchParams }: ConfirmEmailChangePageProps) {
  const params = await searchParams;
  const oldEmail = params?.oldEmail;
  const newEmail = params?.newEmail;
  const confirmed = params?.confirmed === 'true';
  const error = params?.error;

  // Si no hay parámetros necesarios y no está confirmado, redirigir
  if (!confirmed && !oldEmail && !newEmail && !error) {
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
          badge="Confirmación de cambio de correo"
          title="Confirma tu nuevo correo electrónico"
          description="Verifica que el cambio de correo electrónico se haya completado correctamente."
          highlights={[
            "Tu correo electrónico ha sido actualizado exitosamente.",
            "Ahora puedes iniciar sesión con tu nuevo correo.",
            "Recibirás todas las notificaciones en tu nueva dirección.",
          ]}
          rightColumnClassName="items-center justify-center"
        >
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/96 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-2xl sm:p-8">
            <Suspense fallback={
              <div className="flex min-h-[200px] items-center justify-center text-sm text-[color:var(--muted-foreground)]">
                Cargando...
              </div>
            }>
              <ConfirmEmailChangeForm 
                oldEmail={oldEmail}
                newEmail={newEmail}
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
