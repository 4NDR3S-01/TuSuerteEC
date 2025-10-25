import { UpdatePasswordForm } from "../../../components/auth/update-password-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SiteHeader } from "../../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../../config/navigation";

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader
        navItems={PUBLIC_NAV_ITEMS}
        cta={{ href: "/registro", label: "Crear cuenta" }}
      />

      <main className="relative flex w-full min-h-screen items-center justify-center px-4 pb-20 pt-14 text-base sm:px-6 sm:pb-24 sm:pt-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18)_0%,_transparent_55%)]" />

        <AuthPageLayout
          badge="Actualizar contraseña"
          title="Elige una nueva contraseña para tu cuenta."
          description="Por seguridad, tu sesión se cerrará en todos los dispositivos y deberás ingresar con tu nueva contraseña."
          highlights={[
            "Usa al menos 8 caracteres combinando letras, números y símbolos.",
            "No reutilices contraseñas que hayas usado anteriormente.",
            "Si este proceso no lo solicitaste tú, cambia tu contraseña y contacta soporte.",
          ]}
          rightColumnClassName="items-center justify-center"
        >
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/96 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-2xl sm:p-8">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold">Define tu nueva contraseña</h2>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Ingresa y confirma tu nueva contraseña. Este enlace expira rápidamente, así que completa el proceso ahora.
              </p>
            </div>
            <div className="mt-6">
              <UpdatePasswordForm />
            </div>
          </div>
        </AuthPageLayout>
      </main>
    </div>
  );
}
