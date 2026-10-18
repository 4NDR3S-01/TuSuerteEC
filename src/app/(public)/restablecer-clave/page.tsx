import type { Metadata } from "next";
import { Suspense } from "react";
import { UpdatePasswordForm } from "../../../components/auth/update-password-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { Card } from "../../../components/ui/kit";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false },
};

export default function UpdatePasswordPage() {
  return (
    <AuthPageLayout
      badge="Nueva contraseña"
      title="Elige una contraseña nueva para tu cuenta."
      description="Después de guardarla, inicia sesión con la contraseña nueva."
      highlights={[
        "Usa al menos 8 caracteres con letras y números.",
        "No reutilices contraseñas de otros sitios.",
        "Todas tus sesiones abiertas se cerrarán por seguridad.",
      ]}
    >
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-bold">Define tu nueva contraseña</h2>
        <div className="mt-6">
          <Suspense fallback={null}>
            <UpdatePasswordForm />
          </Suspense>
        </div>
      </Card>
    </AuthPageLayout>
  );
}
