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
 * Obtiene la URL base para emails de autenticación
 * SIEMPRE usa la URL de producción, incluso en desarrollo local
 * Esto asegura que los enlaces en los emails siempre apunten a producción
 */
export function getEmailRedirectBaseUrl(): string {
  // Prioridad 1: Variable de entorno explícita
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Prioridad 2: URL de producción hardcodeada (fallback)
  return 'https://tu-suerte-ec.vercel.app';
}

/**
 * Obtiene la URL completa para redirecciones de autenticación
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}

/**
 * Obtiene la URL completa para redirecciones en emails de autenticación
 * SIEMPRE usa la URL de producción para que los enlaces funcionen correctamente
 */
export function getEmailAuthRedirectUrl(path: string = '/auth/callback', params?: Record<string, string>): string {
  const baseUrl = getEmailRedirectBaseUrl();
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}
