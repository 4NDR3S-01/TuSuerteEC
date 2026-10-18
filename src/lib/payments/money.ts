/** Operaciones con dinero en centavos enteros para evitar errores de coma flotante */

export function toCents(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value);
}
