/**
 * Obtiene la URL base de la aplicación según el entorno
 * Usa NEXT_PUBLIC_APP_URL si está definida; si no, localhost
 */
export function getBaseUrl(): string {
  // URL configurada explícitamente
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // En el servidor (SSR)
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  // En el cliente (browser)
  return window.location.origin;
}
