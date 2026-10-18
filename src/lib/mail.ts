import 'server-only';

type Mail = { to: string; subject: string; text: string };

/**
 * Envía un correo por SMTP si está configurado (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM).
 * Sin configuración, el contenido se imprime en la consola del servidor (modo desarrollo).
 */
export async function sendMail(mail: Mail): Promise<{ delivered: boolean }> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    console.info(`\n[CORREO NO ENVIADO: falta SMTP_HOST] Para: ${mail.to}\nAsunto: ${mail.subject}\n${mail.text}\n`);
    return { delivered: false };
  }

  const nodemailer = await import('nodemailer');
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
  return { delivered: true };
}
