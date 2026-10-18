'use client';

import { useEffect, useState } from 'react';
import { FileText, ImageUp, X } from 'lucide-react';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const MAX_BYTES = 10 * 1024 * 1024;

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  error?: string | null;
};

/** Selector del comprobante con vista previa (imagen o PDF, máximo 10 MB) */
export function ReceiptInput({ file, onChange, required, error }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const select = (selected: File | undefined) => {
    setLocalError(null);
    if (!selected) return;
    if (!ACCEPT.split(',').includes(selected.type)) {
      setLocalError('Usa una imagen (JPG, PNG, WEBP) o un PDF.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setLocalError('El archivo supera los 10 MB.');
      return;
    }
    onChange(selected);
  };

  const message = localError ?? error;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">
        Comprobante de pago {required ? <span className="text-[color:var(--danger)]" aria-hidden>*</span> : <span className="font-normal text-[color:var(--muted-foreground)]">(opcional)</span>}
      </p>
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa del comprobante" className="size-14 rounded-lg object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-lg bg-[color:var(--muted)]">
              <FileText className="size-6 text-[color:var(--muted-foreground)]" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex size-9 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
            aria-label="Quitar comprobante"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--border-strong)] p-6 text-center hover:border-[color:var(--accent)] focus-within:border-[color:var(--accent)]">
          <ImageUp className="size-7 text-[color:var(--accent)]" aria-hidden />
          <span className="text-sm font-semibold">Toca para subir la foto o el PDF del comprobante</span>
          <span className="text-xs text-[color:var(--muted-foreground)]">JPG, PNG, WEBP o PDF · máximo 10 MB</span>
          <input type="file" accept={ACCEPT} className="sr-only" onChange={(event) => select(event.target.files?.[0])} />
        </label>
      )}
      {message && <p role="alert" className="text-xs font-medium text-[color:var(--danger)]">{message}</p>}
    </div>
  );
}
