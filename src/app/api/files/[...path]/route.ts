import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/get-user';
import { can } from '../../../../lib/auth/roles';
import { prisma } from '../../../../lib/db';
import { ALLOWED_MIME_TYPES, PRIVATE_UPLOAD_FOLDERS, UPLOADS_DIR, isStoredFileName, isUploadFolder } from '../../../../lib/uploads';

export const runtime = 'nodejs';

const MIME_BY_EXTENSION = Object.fromEntries(
  Object.entries(ALLOWED_MIME_TYPES).map(([mime, ext]) => [ext, mime]),
);

function notFound() {
  return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;

  // Solo se aceptan rutas del tipo <carpeta>/<uuid>.<ext>, sin subdirectorios ni "..".
  if (segments.length !== 2 || !isUploadFolder(segments[0]) || !isStoredFileName(segments[1])) {
    return notFound();
  }

  const [folder, fileName] = segments;
  const extension = fileName.split('.').pop() ?? '';
  const contentType = MIME_BY_EXTENSION[extension];
  if (!contentType) return notFound();

  const isPrivate = PRIVATE_UPLOAD_FOLDERS.includes(folder);

  if (isPrivate) {
    // Comprobantes: solo el dueño del archivo o quien revisa pagos (responde 404 para no revelar si existe)
    const user = await getCurrentUser();
    if (!user) return notFound();
    if (!can(user.role, 'payments.review')) {
      const upload = await prisma.uploads.findUnique({ where: { file_name: fileName }, select: { owner_id: true } });
      if (upload?.owner_id !== user.id) return notFound();
    }
  }

  try {
    const data = await readFile(path.join(UPLOADS_DIR, folder, fileName));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        // Un PDF se descarga en vez de abrirse dentro del sitio
        'Content-Disposition': contentType === 'application/pdf' ? `attachment; filename="${fileName}"` : 'inline',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return notFound();
  }
}
