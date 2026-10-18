/**
 * Preguntas frecuentes. Cada respuesta describe lo que la plataforma hace realmente;
 * si cambia un proceso, actualiza también este texto.
 */
export const FAQS = [
  {
    question: '¿Cómo participo en un sorteo?',
    answer:
      'Crea tu cuenta gratis, elige un sorteo abierto y la cantidad de boletos. Paga por transferencia o código QR con los datos que te mostramos, sube la foto del comprobante y nuestro equipo lo verifica. Cuando se aprueba, tus boletos aparecen en "Mis boletos" con su número único.',
  },
  {
    question: '¿Cuánto tarda la verificación de mi pago?',
    answer:
      'Una persona del equipo revisa cada comprobante manualmente. Te avisamos dentro de la app cuando el pago se aprueba o si encontramos un problema, con el motivo. Si el sorteo cierra antes de aprobar tu pago, te devolvemos el dinero según la política de reembolsos.',
  },
  {
    question: '¿Cómo se elige al ganador?',
    answer:
      'Al cerrar el sorteo publicamos la huella (SHA-256) de una semilla secreta y la huella de la lista de boletos. Al sortear, revelamos la semilla y el ganador se calcula con un algoritmo publicado. En la página de resultados puedes repetir el cálculo en tu navegador y comprobar que nadie cambió la semilla ni los boletos.',
  },
  {
    question: '¿Qué pasa si gano?',
    answer:
      'Recibes un aviso en tu cuenta y te contactamos por teléfono o correo para coordinar la entrega. En la página pública de resultados solo mostramos tu nombre abreviado (por ejemplo, "Juan P.") y tu número de boleto.',
  },
  {
    question: '¿Para qué sirven los planes?',
    answer:
      'Con un plan activo participas automáticamente en los sorteos para suscriptores, sin comprar boletos. Los planes se pagan por período (mes o año) de forma manual: no hay cobros automáticos y no necesitas cancelar nada para dejar de pagar.',
  },
  {
    question: '¿Puedo comprar varios boletos?',
    answer:
      'Sí, salvo que el sorteo tenga un máximo por persona; ese límite aparece en la página del sorteo y cuenta también los pagos que están en revisión.',
  },
  {
    question: 'Olvidé mi contraseña, ¿qué hago?',
    answer:
      'En "Iniciar sesión" elige "¿Olvidaste tu contraseña?" y escribe tu correo. Te enviaremos un enlace que vence en 1 hora y solo funciona una vez.',
  },
  {
    question: '¿Quién puede participar?',
    answer:
      'Personas mayores de 18 años con cédula ecuatoriana válida. Cada cédula puede tener una sola cuenta.',
  },
] as const;

export type FaqItem = (typeof FAQS)[number];
