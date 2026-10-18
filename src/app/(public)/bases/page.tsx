import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, Organizer } from "../../../components/legal/legal-page";

export const metadata: Metadata = { title: "Bases generales de los sorteos", alternates: { canonical: "/bases" } };

export default function RulesPage() {
  return (
    <LegalPage
      current="/bases"
      title="Bases generales de los sorteos"
      intro="Estas bases aplican a todos los sorteos publicados en TuSuerte. Cada sorteo puede agregar condiciones propias, que se muestran en su página."
    >
      <h2>1. Organizador</h2>
      <p>Los sorteos son organizados por <Organizer />.</p>

      <h2>2. Participantes</h2>
      <p>Pueden participar personas mayores de 18 años, residentes o con cédula ecuatoriana, con una cuenta registrada a su nombre. No pueden ganar las cuentas suspendidas.</p>

      <h2>3. Formas de participar</h2>
      <ul>
        <li><strong>Compra de boletos:</strong> cada boleto aprobado tiene un número correlativo único dentro del sorteo y equivale a una oportunidad.</li>
        <li><strong>Suscripción:</strong> las personas con un plan activo reciben una participación automática en los sorteos que admiten suscriptores, hasta el límite de sorteos simultáneos de su plan.</li>
        <li>La modalidad de cada sorteo (solo boletos, solo suscriptores o ambas) se indica en su página. En sorteos solo para suscriptores no se venden boletos.</li>
      </ul>

      <h2>4. Fechas</h2>
      <p>Cada sorteo publica su fecha de apertura, de cierre de participación y de ejecución. Las fechas solo pueden postergarse, nunca adelantarse, y cualquier cambio se publica en la página del sorteo.</p>

      <h2>5. Cierre y selección de ganadores</h2>
      <ol>
        <li>Al cerrar la participación, la lista de boletos queda fija y se publica su huella SHA-256 junto con el compromiso (huella SHA-256) de una semilla secreta de 256 bits.</li>
        <li>En la fecha del sorteo se revela la semilla y los ganadores se calculan con el algoritmo público descrito en la página de resultados (<em>sha256-v1</em>), sin intervención manual.</li>
        <li>Cualquier persona puede repetir el cálculo en la página de <Link href="/resultados">resultados</Link> y comprobar que la semilla y la lista de boletos coinciden con lo publicado al cierre.</li>
        <li>Si el sistema detecta que la lista de boletos cambió después del cierre, el sorteo se detiene y se revisa antes de continuar.</li>
      </ol>

      <h2>6. Publicación de resultados</h2>
      <p>Los resultados se publican con el nombre abreviado de cada ganador (nombre y la inicial del apellido) y su número de boleto. Solo publicaremos fotos o testimonios con autorización expresa del ganador.</p>

      <h2>7. Entrega del premio</h2>
      <ul>
        <li>Contactaremos al ganador por los datos registrados en su cuenta. Para entregar el premio verificaremos su identidad con la cédula registrada.</li>
        <li>Si no logramos contactarlo tras varios intentos en un plazo razonable que se indicará en el aviso, se seguirá el procedimiento que establezcan las condiciones del sorteo.</li>
        <li>Los impuestos que la ley disponga sobre premios se aplicarán conforme a la normativa vigente.</li>
      </ul>

      <h2>8. Cancelación o suspensión</h2>
      <p>Si un sorteo no puede realizarse por causas ajenas a nuestra voluntad, se informará en su página y se devolverá el valor de los boletos según la <Link href="/reembolsos">política de reembolsos</Link>.</p>

      <h2>9. Consultas</h2>
      <p>Para consultas o reclamos sobre un sorteo, escríbenos <ContactLine />.</p>
    </LegalPage>
  );
}
