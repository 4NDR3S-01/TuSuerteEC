import path from 'node:path';

/** Carpeta donde se guardan los archivos subidos (fuera de `public/` para servirlos en caliente) */
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Carpetas permitidas y los roles que pueden subir a cada una */
export const UPLOAD_FOLDERS = {
  'payment-receipts': ['participant', 'staff', 'admin'],
  'raffle-prizes': ['admin'],
  'winners-photos': ['staff', 'admin'],
  'payment-qr-codes': ['admin'],
} as const satisfies Record<string, readonly string[]>;

export type UploadFolder = keyof typeof UPLOAD_FOLDERS;

/**
 * Carpetas privadas: solo las ve quien subió el archivo y el personal que revisa pagos.
 * Los comprobantes contienen datos bancarios y personales.
 */
export const PRIVATE_UPLOAD_FOLDERS: readonly UploadFolder[] = ['payment-receipts'];

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Las imágenes de premios, QR y fotos de entrega no aceptan PDF */
export const IMAGE_ONLY_FOLDERS: readonly UploadFolder[] = ['raffle-prizes', 'payment-qr-codes', 'winners-photos'];

export function isUploadFolder(value: string): value is UploadFolder {
  return Object.prototype.hasOwnProperty.call(UPLOAD_FOLDERS, value);
}

const FILE_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|pdf)$/;

export function isStoredFileName(value: string) {
  return FILE_NAME_PATTERN.test(value);
}

/** Valida que una URL guardada apunte a un archivo subido de la carpeta esperada */
export function safeStoredFileUrl(url: string, folder: UploadFolder): string | null {
  const prefix = `/api/files/${folder}/`;
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
  const fileName = url.slice(prefix.length);
  return isStoredFileName(fileName) ? url : null;
}

export function fileNameFromUrl(url: string) {
  return url.split('/').pop() ?? '';
}

/**
 * Detecta el tipo real del archivo por su firma (no se confía en el tipo que declara el navegador).
 */
export function sniffMimeType(bytes: Uint8Array): string | null {
  const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  if (startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf';
  return null;
}
