import type { Metadata } from "next";
import { ContactLine, LegalPage } from "../../../components/legal/legal-page";

export const metadata: Metadata = { title: "Política de reembolsos", alternates: { canonical: "/reembolsos" } };

export default function RefundsPage() {
  return (
    <LegalPage
      current="/reembolsos"
      title="Política de reembolsos"
      intro="Aquí explicamos en qué casos devolvemos el dinero y cómo solicitarlo."
    >
      <h2>1. Cuándo devolvemos el dinero</h2>
      <ul>
        <li>El sorteo cerró antes de que verificáramos tu pago, por lo que no se emitieron boletos.</li>
        <li>El sorteo se canceló o no pudo realizarse.</li>
        <li>Pagaste dos veces por error el mismo pedido, o pagaste un monto mayor al indicado.</li>
        <li>Rechazamos tu pago por un error nuestro.</li>
      </ul>

      <h2>2. Cuándo no aplica</h2>
      <ul>
        <li>Boletos ya emitidos en un sorteo que se realizó normalmente.</li>
        <li>Pagos rechazados por comprobantes falsos, alterados o de terceros sin autorización.</li>
        <li>Planes cuyo período ya está en curso, salvo error nuestro.</li>
      </ul>

      <h2>3. Cómo solicitarlo</h2>
      <p>Escríbenos <ContactLine /> indicando tu cédula, el sorteo o plan y la referencia del comprobante. La devolución se hace a la cuenta bancaria del titular de la cuenta en TuSuerte.</p>

      <h2>4. Plazos</h2>
      <p>Revisamos cada solicitud y respondemos con la decisión y, si corresponde, la fecha estimada de la transferencia. Si el reembolso se origina en una cancelación nuestra, lo iniciamos sin que tengas que solicitarlo.</p>
    </LegalPage>
  );
}
