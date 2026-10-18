import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";

import { RaffleCard } from "../../../components/raffles/raffle-card";
import { RaffleFilters } from "../../../components/raffles/raffle-filters";
import { ButtonLink, EmptyState, SectionHeader } from "../../../components/ui/kit";
import { ENTRY_MODES, PRIZE_CATEGORIES } from "../../../lib/raffle/labels";
import { listPublicRaffles, type PublicRaffleFilters } from "../../../lib/queries/public";

export const metadata: Metadata = {
  title: "Sorteos abiertos",
  description: "Sorteos abiertos en TuSuerte: premios, precio por boleto, fechas y condiciones de participación.",
  alternates: { canonical: "/sorteos" },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function PublicRafflesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const filters: PublicRaffleFilters = {
    q: params.q?.trim() || undefined,
    category: params.category && params.category in PRIZE_CATEGORIES ? params.category : undefined,
    mode: params.mode && params.mode in ENTRY_MODES ? params.mode : undefined,
    sort: (["closing", "newest", "price_asc", "price_desc"] as const).find((value) => value === params.sort),
  };
  const raffles = await listPublicRaffles(filters, 48);
  const hasFilters = Boolean(filters.q || filters.category || filters.mode);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        as="h1"
        eyebrow="Sorteos"
        title="Sorteos abiertos"
        description="Revisa el premio, el precio, las fechas y las condiciones antes de participar."
        action={<ButtonLink href="/resultados" variant="secondary">Ver sorteos realizados</ButtonLink>}
      />
      <RaffleFilters action="/sorteos" values={params} />

      <p className="text-sm text-[color:var(--muted-foreground)]" aria-live="polite">
        {raffles.length === 1 ? "1 sorteo encontrado" : `${raffles.length} sorteos encontrados`}
        {hasFilters && (
          <>
            {" · "}
            <Link href="/sorteos" className="font-semibold text-[color:var(--accent)] hover:underline">Quitar filtros</Link>
          </>
        )}
      </p>

      {raffles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {raffles.map((raffle) => (
            <RaffleCard key={raffle.id} raffle={raffle} href={`/sorteos/${raffle.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Gift}
          title={hasFilters ? "Ningún sorteo coincide con tu búsqueda" : "No hay sorteos abiertos ahora"}
          description={hasFilters ? "Prueba con otros filtros." : "Crea tu cuenta para enterarte cuando abramos el próximo."}
          action={hasFilters ? <ButtonLink href="/sorteos" variant="secondary">Ver todos</ButtonLink> : <ButtonLink href="/registro">Crear cuenta</ButtonLink>}
        />
      )}
    </div>
  );
}
