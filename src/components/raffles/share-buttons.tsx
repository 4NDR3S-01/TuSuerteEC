'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Facebook, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '../ui/kit';

type Props = { url: string; title: string; text?: string };

/** Compartir por WhatsApp, Facebook, el menú nativo del dispositivo o copiando el enlace */
export function ShareButtons({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);
  // Se detecta después de montar para que el HTML del servidor y del cliente coincidan
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);
  const message = text ?? `Mira este sorteo en TuSuerte: ${title}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia este enlace:', url);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: message, url });
    } catch {
      // La persona cerró el menú: no hay nada que hacer
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[color:var(--border-strong)] px-3 text-sm font-semibold hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
      >
        <MessageCircle className="size-4" aria-hidden /> WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[color:var(--border-strong)] px-3 text-sm font-semibold hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
      >
        <Facebook className="size-4" aria-hidden /> Facebook
      </a>
      <Button variant="secondary" size="sm" onClick={copy} aria-live="polite">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'Enlace copiado' : 'Copiar enlace'}
      </Button>
      {canShare && (
        <Button variant="ghost" size="sm" onClick={nativeShare}>
          <Share2 aria-hidden /> Más opciones
        </Button>
      )}
    </div>
  );
}
