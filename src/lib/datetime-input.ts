/** Convierte una fecha ISO al formato de <input type="datetime-local"> en la hora local del navegador */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Convierte el valor de un <input type="datetime-local"> (hora local) a ISO */
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
