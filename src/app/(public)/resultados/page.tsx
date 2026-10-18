import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import { Badge, Card, EmptyState, SectionHeader } from "../../../components/ui/kit";
import { prisma } from "../../../lib/db";
import { WINNER_STATUS, abbreviateName, formatDate, prizeCategory } from "../../../lib/raffle/labels";

export const metadata: Metadata = {
  title: "Resultados de sorteos",
  description: "Historial de sorteos realizados en TuSuerte con ganadores y datos para verificar cada resultado.",
  alternates: { canonical: "/resultados" },
};

export default async function ResultsPage() {
  const raffles = await prisma.raffles.findMany({
    where: { status: { in: ["drawn", "completed"] } },
    orderBy: { drawn_at: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      prize_description: true,
      prize_category: true,
      drawn_at: true,
      _count: { select: { raffle_entries: true } },
      winners: {
        orderBy: { prize_position: "asc" },
        select: { id: true, status: true, prize_position: true, raffle_entries: { select: { ticket_number: true } }, profiles: { select: { full_name: true } } },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        as="h1"
        eyebrow="Resultados"
        title="Sorteos realizados"
        description="Cada resultado incluye la semilla, el compromiso publicado al cierre y la lista de boletos para que puedas verificarlo."
      />
      {raffles.length === 0 ? (
        <EmptyState icon={Trophy} title="Aún no se ha realizado ningún sorteo" description="Cuando realicemos el primero, aquí encontrarás los ganadores y la verificación." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {raffles.map((raffle) => {
            const category = prizeCategory(raffle.prize_category);
            return (
              <Card key={raffle.id} className="flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
                      <category.icon className="size-3.5" aria-hidden /> Sorteado el {formatDate(raffle.drawn_at)} · {raffle._count.raffle_entries} boletos
                    </p>
                    <h2 className="mt-1 text-lg font-bold">{raffle.title}</h2>
                    <p className="text-sm text-[color:var(--muted-foreground)]">{raffle.prize_description}</p>
                  </div>
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {raffle.winners.map((winner) => {
                    const status = WINNER_STATUS[winner.status] ?? WINNER_STATUS.pending_contact;
                    return (
                      <li key={winner.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[color:var(--muted)] px-3 py-2 text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <Trophy className="size-4 text-[color:var(--accent)]" aria-hidden />
                          {winner.prize_position}° {abbreviateName(winner.profiles?.full_name)}
                          <span className="font-mono text-xs text-[color:var(--muted-foreground)]">#{winner.raffle_entries?.ticket_number}</span>
                        </span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
                <Link href={`/resultados/${raffle.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)] hover:underline">
                  Ver detalle y verificar <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
