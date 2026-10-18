import {
  Banknote,
  Car,
  Dumbbell,
  Gamepad2,
  Gift,
  House,
  Plane,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';

/** Textos e iconos compartidos por toda la interfaz para sorteos, pagos y premios */

export const RAFFLE_STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' | 'info' | 'accent' }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  active: { label: 'Abierto', tone: 'success' },
  closed: { label: 'Cerrado · por sortear', tone: 'warning' },
  drawn: { label: 'Sorteado', tone: 'info' },
  completed: { label: 'Finalizado', tone: 'neutral' },
};

export const ENTRY_MODES: Record<string, { label: string; description: string }> = {
  tickets_only: {
    label: 'Compra de boletos',
    description: 'Participas comprando boletos. Cada boleto es una oportunidad.',
  },
  subscribers_only: {
    label: 'Solo suscriptores',
    description: 'Participan automáticamente quienes tienen un plan activo. No se venden boletos.',
  },
  hybrid: {
    label: 'Boletos y suscriptores',
    description: 'Puedes comprar boletos y, si tienes un plan activo, también participas automáticamente.',
  },
};

export const PRIZE_CATEGORIES: Record<string, { label: string; icon: LucideIcon }> = {
  electronics: { label: 'Tecnología', icon: Smartphone },
  vehicles: { label: 'Vehículos', icon: Car },
  travel: { label: 'Viajes', icon: Plane },
  cash: { label: 'Efectivo', icon: Banknote },
  home: { label: 'Hogar', icon: House },
  entertainment: { label: 'Entretenimiento', icon: Gamepad2 },
  sports: { label: 'Deportes', icon: Dumbbell },
  other: { label: 'Otros', icon: Gift },
};

export function prizeCategory(category: string | null | undefined) {
  return PRIZE_CATEGORIES[category ?? 'other'] ?? PRIZE_CATEGORIES.other;
}

export const PAYMENT_STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'En revisión', tone: 'warning' },
  approved: { label: 'Aprobado', tone: 'success' },
  completed: { label: 'Aprobado', tone: 'success' },
  rejected: { label: 'Rechazado', tone: 'danger' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
};

export const WINNER_STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' | 'info' }> = {
  pending_contact: { label: 'Por contactar', tone: 'warning' },
  contacted: { label: 'Contactado', tone: 'info' },
  prize_delivered: { label: 'Premio entregado', tone: 'success' },
};

/** "Juan Pérez Gómez" → "Juan P." (protege la identidad del ganador en páginas públicas) */
export function abbreviateName(fullName: string | null | undefined) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Participante';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

/*
 * Formato de fechas y montos determinista (igual en el servidor y en el navegador).
 * Intl produce textos ligeramente distintos según la versión de ICU, lo que rompe la hidratación de React.
 * Ecuador continental usa UTC-5 todo el año (sin horario de verano).
 */
const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function ecuadorParts(value: string | Date) {
  const date = new Date(new Date(value).getTime() + ECUADOR_OFFSET_MS);
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth(),
    year: date.getUTCFullYear(),
    hours: String(date.getUTCHours()).padStart(2, '0'),
    minutes: String(date.getUTCMinutes()).padStart(2, '0'),
  };
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return 'Por definir';
  const p = ecuadorParts(value);
  return `${p.day} de ${MONTHS[p.month]} de ${p.year}, ${p.hours}:${p.minutes}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'Por definir';
  const p = ecuadorParts(value);
  return `${p.day} de ${MONTHS[p.month]} de ${p.year}`;
}

export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const p = ecuadorParts(value);
  return `${p.day} ${MONTHS[p.month].slice(0, 3)}`;
}

export function formatPrice(value: number | null | undefined, currency = 'USD') {
  if (value === null || value === undefined) return '—';
  const [integer, decimals] = Math.abs(value).toFixed(2).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${value < 0 ? '-' : ''}${symbol}${grouped},${decimals}`;
}
