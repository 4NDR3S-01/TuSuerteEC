import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, Organizer } from "../../../components/legal/legal-page";

export const metadata: Metadata = { title: "Términos y condiciones", alternates: { canonical: "/terminos" } };

export default function TermsPage() {
  return (
    <LegalPage
      current="/terminos"
      title="Términos y condiciones de uso"
      intro="Estos términos regulan el uso de la plataforma TuSuerte. Al crear una cuenta declaras que los leíste y aceptas."
    >
      <h2>1. Quién opera la plataforma</h2>
      <p>La plataforma es operada por <Organizer />. Puedes contactarnos <ContactLine />.</p>

      <h2>2. Requisitos para usar la plataforma</h2>
      <ul>
        <li>Ser mayor de 18 años y tener cédula de identidad ecuatoriana válida.</li>
        <li>Registrar datos verdaderos. Cada persona puede tener una sola cuenta.</li>
        <li>Mantener la confidencialidad de tu contraseña. Las acciones hechas desde tu cuenta se consideran tuyas.</li>
      </ul>

      <h2>3. Participación y pagos</h2>
      <ul>
        <li>Los pagos se realizan por transferencia bancaria o código QR a las cuentas que aparecen dentro de tu sesión. No aceptamos pagos por otros medios ni solicitados por mensajes privados.</li>
        <li>Antes de pagar ves el total exacto. Los boletos se emiten cuando nuestro equipo verifica el comprobante; hasta entonces el pago queda &quot;en revisión&quot;.</li>
        <li>Un comprobante solo puede usarse una vez. Enviar comprobantes falsos, alterados o ajenos causa el rechazo del pago y puede llevar a la suspensión de la cuenta.</li>
        <li>Las condiciones de cada sorteo (precio, fechas, ganadores, máximo por persona) se publican en su página y no cambian en perjuicio de quienes ya participan.</li>
      </ul>

      <h2>4. Planes de suscripción</h2>
      <p>Los planes se pagan por período (mes o año) de forma manual y dan participación automática en los sorteos para suscriptores durante su vigencia. No hay renovación ni cobro automático.</p>

      <h2>5. Códigos de descuento y referidos</h2>
      <p>Los códigos tienen vigencia, alcance y límite de usos indicados al aplicarlos. Los códigos de referidos son personales e intransferibles y se entregan cuando la persona invitada completa su primer pago aprobado. Podemos anular códigos obtenidos de forma fraudulenta.</p>

      <h2>6. Suspensión de cuentas</h2>
      <p>Podemos suspender cuentas ante fraude, suplantación de identidad, uso de comprobantes falsos o incumplimiento de estos términos. La suspensión conserva el historial de pagos y boletos para fines de auditoría.</p>

      <h2>7. Responsabilidad</h2>
      <p>Hacemos lo razonable para que la plataforma funcione sin interrupciones y de forma segura, pero no garantizamos disponibilidad continua. Los sorteos se rigen por sus <Link href="/bases">bases</Link>.</p>

      <h2>8. Datos personales</h2>
      <p>Tratamos tus datos según la <Link href="/privacidad">política de privacidad</Link>, conforme a la Ley Orgánica de Protección de Datos Personales.</p>

      <h2>9. Cambios a estos términos</h2>
      <p>Si cambiamos estos términos, publicaremos la nueva versión con su fecha. Los cambios no afectan a los sorteos que ya estén abiertos.</p>

      <h2>10. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República del Ecuador. Antes de acudir a otras instancias, te pedimos escribirnos para buscar una solución.</p>
    </LegalPage>
  );
}
