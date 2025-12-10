/**
 * Obtiene la URL base de la aplicación según el entorno
 * En producción usa el dominio de Vercel, en desarrollo usa localhost
 */
export function getBaseUrl(): string {
  // En producción (Vercel)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // En el servidor (SSR)
  if (typeof window === 'undefined') {
    // En producción de Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Fallback para desarrollo en servidor
    return 'http://localhost:3000';
  }

  // En el cliente (browser)
  return window.location.origin;
}

/**
 * Obtiene la URL completa para redirecciones de autenticación
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}
