/**
 * Datos públicos del negocio. Se configuran con variables de entorno (ver README);
 * mientras estén vacíos, la interfaz no los muestra.
 */

function env(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const SITE = {
  name: 'TuSuerte',
  description:
    'Sorteos en línea en Ecuador con reglas claras, pagos verificados por nuestro equipo y resultados que cualquiera puede comprobar.',
  url: env(process.env.NEXT_PUBLIC_APP_URL) ?? 'http://localhost:3000',
  /** Razón social y RUC del organizador (aparecen en las bases y la política de privacidad) */
  legalName: env(process.env.NEXT_PUBLIC_LEGAL_NAME),
  taxId: env(process.env.NEXT_PUBLIC_LEGAL_TAX_ID),
  address: env(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  /** Indica si un abogado revisó los textos legales; mientras sea falso se muestra un aviso */
  legalReviewed: process.env.NEXT_PUBLIC_LEGAL_REVIEWED === 'true',
  contact: {
    email: env(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    phone: env(process.env.NEXT_PUBLIC_CONTACT_PHONE),
    whatsapp: env(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP),
    instagram: env(process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM),
    facebook: env(process.env.NEXT_PUBLIC_CONTACT_FACEBOOK),
    hours: env(process.env.NEXT_PUBLIC_CONTACT_HOURS),
  },
  /** Fecha de la última actualización de los documentos legales */
  legalUpdatedAt: '2026-10-17T12:00:00-05:00',
} as const;

export function hasAnyContact() {
  const { email, phone, whatsapp, instagram, facebook } = SITE.contact;
  return Boolean(email || phone || whatsapp || instagram || facebook);
}

export function whatsappUrl(number: string, text?: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function instagramUrl(handle: string) {
  return handle.startsWith('http') ? handle : `https://www.instagram.com/${handle.replace(/^@/, '')}`;
}
