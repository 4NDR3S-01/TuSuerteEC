import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

import { LoginForm } from "../../../components/auth/login-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { SessionExpiredMessage } from "../../../components/auth/session-expired-message";
import { Card, Notice } from "../../../components/ui/kit";
import { getCurrentUser } from "../../../lib/auth/get-user";
import { getRedirectPath, safeInternalPath } from "../../../lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false },
};

type LoginPageProps = {
  searchParams?: Promise<{ redirectTo?: string; reason?: string }>;
};

// Solo se muestran mensajes conocidos (nunca texto arbitrario de la URL)
const REASONS: Record<string, string> = {
  password_changed: "Cambiaste tu contraseña. Inicia sesión con la nueva.",
  password_reset: "Tu contraseña se restableció. Ya puedes iniciar sesión.",
  registered: "Tu cuenta está lista. Inicia sesión para continuar.",
  email_changed: "Actualizaste tu correo. Inicia sesión con la nueva dirección.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect(getRedirectPath(user.role));
  }

  const params = await searchParams;
  const redirectTo = safeInternalPath(params?.redirectTo);
  const reason = params?.reason ? REASONS[params.reason] : undefined;

  return (
    <AuthPageLayout
      badge="Bienvenido de vuelta"
      title="Ingresa para ver tus boletos y participar."
      description="Desde tu cuenta revisas tus boletos, el estado de tus pagos y los resultados de cada sorteo."
      highlights={[
        "Tus boletos con número único y comprobante de cada pago.",
        "Avisos cuando verificamos tu pago o publicamos resultados.",
        "Resultados verificables con el procedimiento completo.",
      ]}
    >
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-bold">Inicia sesión</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Usa el correo y la contraseña con los que te registraste.</p>
        <div className="mt-4 space-y-3">
          <Suspense fallback={null}>
            <SessionExpiredMessage />
          </Suspense>
          {reason && (
            <Notice tone="success" icon={CheckCircle2}>
              {reason}
            </Notice>
          )}
        </div>
        <div className="mt-6">
          <LoginForm redirectTo={redirectTo} />
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-[color:var(--border)] pt-5 text-sm text-[color:var(--muted-foreground)] sm:flex-row sm:justify-between">
          <Link href="/recuperar" className="font-semibold text-[color:var(--accent)] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <p>
            ¿No tienes cuenta?{" "}
            <Link href={redirectTo ? `/registro?redirectTo=${encodeURIComponent(redirectTo)}` : "/registro"} className="font-semibold text-[color:var(--accent)] hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </Card>
    </AuthPageLayout>
  );
}
