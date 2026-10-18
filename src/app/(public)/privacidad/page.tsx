import type { Metadata } from "next";
import { ContactLine, LegalPage, Organizer } from "../../../components/legal/legal-page";

export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      current="/privacidad"
      title="Política de privacidad"
      intro="Explicamos qué datos personales tratamos, para qué y cuáles son tus derechos según la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP)."
    >
      <h2>1. Responsable del tratamiento</h2>
      <p><Organizer />. Contacto para temas de privacidad: <ContactLine />.</p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li><strong>Identificación y contacto:</strong> nombre, cédula, correo, teléfono, ciudad, parroquia y dirección.</li>
        <li><strong>Participación:</strong> boletos, sorteos, planes, pagos, comprobantes y referencias de transacción.</li>
        <li><strong>Seguridad:</strong> registros de acceso y de acciones sensibles (por ejemplo, dirección IP al iniciar sesión).</li>
      </ul>
      <p>No almacenamos datos de tarjetas: los pagos se hacen por transferencia o QR fuera de la plataforma.</p>

      <h2>3. Finalidades y base legal</h2>
      <ul>
        <li>Gestionar tu cuenta, tus participaciones y la entrega de premios (ejecución del contrato).</li>
        <li>Verificar pagos y prevenir fraude, incluida la identificación con cédula (interés legítimo y obligación legal).</li>
        <li>Publicar resultados con tu nombre abreviado y número de boleto (ejecución de las bases y transparencia del sorteo).</li>
        <li>Enviarte avisos dentro de la app sobre tus pagos y sorteos (ejecución del contrato). Las comunicaciones promocionales solo con tu consentimiento, que puedes retirar en Configuración.</li>
      </ul>

      <h2>4. Quién accede a tus datos</h2>
      <p>Solo el personal autorizado: el equipo de pagos ve tus comprobantes y el equipo de premios tus datos de contacto si ganas. No vendemos tus datos. Podemos compartirlos con autoridades cuando la ley lo exija.</p>

      <h2>5. Conservación</h2>
      <p>Conservamos los datos mientras tu cuenta exista y, después, el tiempo necesario para cumplir obligaciones legales, contables y de auditoría de los sorteos.</p>

      <h2>6. Tus derechos</h2>
      <p>Puedes ejercer tus derechos de acceso, rectificación, actualización, eliminación, oposición, portabilidad y suspensión del tratamiento escribiéndonos <ContactLine />. Responderemos en los plazos que establece la LOPDP. También puedes acudir a la Superintendencia de Protección de Datos Personales.</p>

      <h2>7. Seguridad</h2>
      <p>Usamos contraseñas cifradas con bcrypt, sesiones firmadas, control de acceso por rol, comprobantes privados y registros de auditoría. Ningún sistema es infalible: si detectamos un incidente que afecte tus datos, te informaremos según la ley.</p>

      <h2>8. Cookies</h2>
      <p>Usamos únicamente cookies necesarias para mantener tu sesión y preferencias (como el tema claro u oscuro). No usamos cookies de publicidad ni de rastreo de terceros.</p>
    </LegalPage>
  );
}
