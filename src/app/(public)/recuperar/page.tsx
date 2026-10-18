import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "../../../components/auth/reset-password-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { Card } from "../../../components/ui/kit";
import { getCurrentUser } from "../../../lib/auth/get-user";
import { getRedirectPath } from "../../../lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

export default async function RecoverPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getRedirectPath(user.role));
  }

  return (
    <AuthPageLayout
      badge="Recuperar acceso"
      title="Restablece tu contraseña de forma segura."
      description="Te enviaremos un enlace personal para crear una contraseña nueva."
      highlights={[
        "El enlace vence en 1 hora y solo funciona una vez.",
        "Al cambiar la contraseña se cierran las sesiones abiertas en otros dispositivos.",
        "Si no solicitaste el cambio, ignora el mensaje: tu cuenta sigue protegida.",
      ]}
    >
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-bold">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Escribe el correo con el que te registraste.</p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
        <p className="mt-6 border-t border-[color:var(--border)] pt-5 text-sm text-[color:var(--muted-foreground)]">
          ¿La recordaste?{" "}
          <Link href="/iniciar-sesion" className="font-semibold text-[color:var(--accent)] hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
