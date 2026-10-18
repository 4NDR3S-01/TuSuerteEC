import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { RegisterForm } from "../../../components/auth/register-form";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { getCurrentUser } from "../../../lib/auth/get-user";
import { getRedirectPath, safeInternalPath } from "../../../lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate gratis en TuSuerte para participar en sorteos con reglas claras y resultados verificables.",
};

type RegisterPageProps = {
  searchParams?: Promise<{ ref?: string; redirectTo?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect(getRedirectPath(user.role));
  }

  const params = await searchParams;
  const candidate = params?.ref ?? (await cookies()).get("ref")?.value;
  const referralCode = typeof candidate === "string" && /^[A-Za-z0-9]{4,12}$/.test(candidate) ? candidate.toUpperCase() : null;

  return (
    <AuthPageLayout
      wide
      badge="Registro gratuito"
      title="Crea tu cuenta en un par de minutos."
      description="Registrarte no tiene costo. Solo pagas cuando decides comprar boletos o un plan, y nuestro equipo verifica cada pago."
      highlights={[
        "Tu cédula garantiza una cuenta por persona y protege la entrega del premio.",
        "Cada boleto tiene un número único que verás en tu cuenta.",
        "Puedes revisar el procedimiento y el resultado de cada sorteo.",
      ]}
    >
      <RegisterForm referralCode={referralCode} redirectTo={safeInternalPath(params?.redirectTo)} />
    </AuthPageLayout>
  );
}
