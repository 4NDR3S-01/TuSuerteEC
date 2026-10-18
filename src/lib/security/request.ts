import { headers } from 'next/headers';

/** IP del cliente según el proxy (X-Forwarded-For / X-Real-IP); "local" si no hay cabeceras */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return headerList.get('x-real-ip') ?? 'local';
  } catch {
    return 'local';
  }
}
