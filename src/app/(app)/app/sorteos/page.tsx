import Link from 'next/link';
import { Bookmark, Gift } from 'lucide-react';
import { prisma } from '../../../../lib/db';
import { requirePageUser } from '../../../../lib/auth/get-user';
import { ENTRY_MODES, PRIZE_CATEGORIES } from '../../../../lib/raffle/labels';
import { listPublicRaffles, type PublicRaffleFilters } from '../../../../lib/queries/public';
import { RaffleCard } from '../../../../components/raffles/raffle-card';
import { RaffleFilters } from '../../../../components/raffles/raffle-filters';
import { FavoriteButton } from '../../../../components/raffles/favorite-button';
import { EmptyState, SectionHeader } from '../../../../components/ui/kit';
import { cn } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | undefined>> };

export default async function AppRafflesPage({ searchParams }: PageProps) {
  const user = await requirePageUser('/app/sorteos');
  const params = (await searchParams) ?? {};
  const onlySaved = params.vista === 'guardados';
  const filters: PublicRaffleFilters = {
    q: params.q?.trim() || undefined,
    category: params.category && params.category in PRIZE_CATEGORIES ? params.category : undefined,
    mode: params.mode && params.mode in ENTRY_MODES ? params.mode : undefined,
    sort: (['closing', 'newest', 'price_asc', 'price_desc'] as const).find((value) => value === params.sort),
  };

  const [raffles, favorites] = await Promise.all([
    listPublicRaffles(filters, 60),
    prisma.raffle_favorites.findMany({ where: { user_id: user.id }, select: { raffle_id: true } }),
  ]);
  const favoriteIds = new Set(favorites.map((favorite) => favorite.raffle_id));
  const visible = onlySaved ? raffles.filter((raffle) => favoriteIds.has(raffle.id)) : raffles;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <SectionHeader as="h1" title="Sorteos" description="Guarda los que te interesan y te avisaremos 24 horas antes de que cierren." />

      <nav aria-label="Vista" className="flex gap-2">
        {[
          { href: '/app/sorteos', label: 'Abiertos', active: !onlySaved },
          { href: '/app/sorteos?vista=guardados', label: `Guardados (${favoriteIds.size})`, active: onlySaved },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold',
              tab.active ? 'bg-[color:var(--foreground)] text-[color:var(--background)]' : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {!onlySaved && <RaffleFilters action="/app/sorteos" values={params} />}

      {visible.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((raffle) => (
            <RaffleCard
              key={raffle.id}
              raffle={raffle}
              href={`/app/sorteos/${raffle.id}`}
              footer={
                <div className="flex justify-end">
                  <FavoriteButton raffleId={raffle.id} initialFavorite={favoriteIds.has(raffle.id)} isAuthenticated compact />
                </div>
              }
            />
          ))}
        </div>
      ) : onlySaved ? (
        <EmptyState icon={Bookmark} title="No tienes sorteos guardados abiertos" description="Usa el botón Guardar en cualquier sorteo para recibir un recordatorio antes del cierre." />
      ) : (
        <EmptyState icon={Gift} title="No hay sorteos que coincidan" description="Prueba con otros filtros o vuelve pronto." />
      )}
    </div>
  );
}
