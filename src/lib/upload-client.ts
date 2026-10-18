'use client';

import type { UploadFolder } from './uploads';

/** Sube un archivo al servidor y devuelve la URL pública para guardarla en la base de datos */
export async function uploadFile(file: Blob, folder: UploadFolder, fileName = 'archivo'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : fileName);
  formData.append('folder', folder);

  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

  if (!response.ok || !body.url) {
    throw new Error(body.error ?? 'No se pudo subir el archivo');
  }

  return body.url;
}
