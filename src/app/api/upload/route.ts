import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth/get-user';
import { prisma } from '../../../lib/db';
import { checkRateLimit } from '../../../lib/security/rate-limit';
import {
  ALLOWED_MIME_TYPES,
  IMAGE_ONLY_FOLDERS,
  MAX_UPLOAD_BYTES,
  UPLOAD_FOLDERS,
  UPLOADS_DIR,
  isUploadFolder,
  sniffMimeType,
} from '../../../lib/uploads';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!checkRateLimit(`upload:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: 'Subiste demasiados archivos. Intenta más tarde.' }, { status: 429 });
  }

  // Rechazar cuerpos enormes antes de leerlos
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'El archivo supera el tamaño máximo de 10 MB' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const file = formData.get('file');
  const folder = String(formData.get('folder') ?? '');

  if (!isUploadFolder(folder)) {
    return NextResponse.json({ error: 'Carpeta no válida' }, { status: 400 });
  }

  const allowedRoles: readonly string[] = UPLOAD_FOLDERS[folder];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'No tienes permiso para subir archivos aquí' }, { status: 403 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'El archivo está vacío o supera el tamaño máximo de 10 MB' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffMimeType(bytes);
  const extension = mimeType ? ALLOWED_MIME_TYPES[mimeType] : undefined;
  if (!mimeType || !extension || (mimeType === 'application/pdf' && IMAGE_ONLY_FOLDERS.includes(folder))) {
    return NextResponse.json(
      { error: IMAGE_ONLY_FOLDERS.includes(folder) ? 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.' : 'Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF.' },
      { status: 400 },
    );
  }

  const fileName = `${randomUUID()}.${extension}`;
  const targetDir = path.join(UPLOADS_DIR, folder);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, fileName), bytes);

  await prisma.uploads.create({
    data: { owner_id: user.id, folder, file_name: fileName, mime_type: mimeType, size: file.size },
  });

  return NextResponse.json({ url: `/api/files/${folder}/${fileName}` });
}
