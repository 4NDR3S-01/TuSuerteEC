export const FAQS = [
  {
    question: "¿Cómo puedo iniciar sesión?",
    answer:
      "Haz clic en el botón 'Iniciar sesión' en la parte superior derecha. Ingresa tu correo y contraseña para acceder a tu cuenta. Si olvidaste tu contraseña, utiliza la opción de recuperación. Si aún no tienes una cuenta, regístrate gratis.",
  },
  {
    question: "¿Que pasa si olvido mi contraseña?",
    answer:
      "Puedes hacer clic en 'Olvidé mi contraseña' en la pantalla de inicio de sesión. Se te enviará un correo electrónico con instrucciones para restablecerla.",
  },
  {
    question: "¿Cómo puedo crear una cuenta?",
    answer:
      "Haz clic en 'Registrarse' en la pantalla de inicio de sesión. Completa el formulario con tu información y sigue las instrucciones para verificar tu correo electrónico.",
  },
  {
    question: "¿Cómo garantizan la transparencia del sorteo?",
    answer:
      "Cada sorteo se ejecuta con un algoritmo auditado y almacenamos el acta firmada. Apenas sean publicados los resultados en nuestras redes sociales, la página se refresca con los datos oficiales.",
  },
  {
    question: "¿Que pasa si gano?",
    answer:
      "Si ganas, recibirás un correo electrónico con la confirmación de tu premio y los siguientes pasos a seguir. Asegúrate de revisar tu bandeja de entrada y seguir las instrucciones proporcionadas.",
  },
  {
    question: "¿Puedo participar en múltiples sorteos?",
    answer:
      "Sí, puedes participar en tantos sorteos como desees, siempre y cuando cumplas con los requisitos específicos de cada uno.",
  },
] as const;

export const SUPPORT_CHANNELS = [
  {
    title: "Redes sociales",
    description:
      "Resolvemos dudas y compartimos novedades en Instagram. Envíanos un mensaje directo para una respuesta rápida.",
    href: "https://www.instagram.com/tusuerte",
    label: "Abrir Instagram",
    icon: "🌐",
  },
  {
    title: "Línea telefónica",
    description:
      "Atención humana de lunes a viernes de 9h00 a 18h00. Marca y te guiaremos paso a paso.",
    href: "tel:+593963924479",
    label: "Llamar al soporte",
    icon: "📞",
  },
  {
    title: "Correo electrónico",
    description:
      "Para casos detallados o seguimiento de premios, escríbenos y te responderemos en menos de 24 horas.",
    href: "mailto:soporte@tusuerte.com",
    label: "Enviar correo",
    icon: "✉️",
  },
] as const;

export type FaqItem = (typeof FAQS)[number];
export type SupportChannel = (typeof SUPPORT_CHANNELS)[number];
