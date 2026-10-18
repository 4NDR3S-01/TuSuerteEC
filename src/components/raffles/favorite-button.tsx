'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toggleFavoriteRaffle } from '../../lib/actions/marketing';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/kit';

type Props = {
  raffleId: string;
  initialFavorite: boolean;
  isAuthenticated: boolean;
  compact?: boolean;
};

/** Guardar un sorteo: recibirás un aviso en la app 24 horas antes de que cierre */
export function FavoriteButton({ raffleId, initialFavorite, isAuthenticated, compact = false }: Props) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  const toggle = () => {
    if (!isAuthenticated) {
      router.push(`/iniciar-sesion?redirectTo=${encodeURIComponent(`/app/sorteos/${raffleId}`)}`);
      return;
    }
    startTransition(async () => {
      const result = await toggleFavoriteRaffle(raffleId);
      if (!result.success) {
        showToast({ type: 'error', description: result.error ?? 'No se pudo guardar el sorteo.' });
        return;
      }
      setFavorite(Boolean(result.favorite));
      showToast({
        type: 'success',
        description: result.favorite ? 'Guardado. Te avisaremos 24 horas antes del cierre.' : 'Quitado de tus guardados.',
      });
    });
  };

  return (
    <Button
      variant={favorite ? 'secondary' : 'ghost'}
      size={compact ? 'icon' : 'sm'}
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? 'Quitar de guardados' : 'Guardar sorteo y recibir recordatorio'}
      title={favorite ? 'Quitar de guardados' : 'Guardar y recibir un recordatorio antes del cierre'}
    >
      {favorite ? <BookmarkCheck className="text-[color:var(--accent)]" aria-hidden /> : <Bookmark aria-hidden />}
      {!compact && (favorite ? 'Guardado' : 'Guardar')}
    </Button>
  );
}
