import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Fingerprint, Trophy } from "lucide-react";

import { DrawVerifier } from "../../../../components/raffles/draw-verifier";
import { Badge, Card, Notice } from "../../../../components/ui/kit";
import { prisma } from "../../../../lib/db";
import { eligibleEntriesWhere } from "../../../../lib/raffle/raffle-algorithm";
import { ENTRY_MODES, WINNER_STATUS, abbreviateName, formatDateTime } from "../../../../lib/raffle/labels";

type PageProps = { params: Promise<{ id: string }> };

async function loadResult(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return prisma.raffles.findFirst({
    where: { id, status: { in: ["closed", "drawn", "completed"] } },
    select: {
      id: true,
      title: true,
      prize_description: true,
      status: true,
      entry_mode: true,
      total_winners: true,
      draw_seed: true,
      draw_commitment: true,
      entries_hash: true,
      draw_algorithm: true,
      closed_at: true,
      drawn_at: true,
      draw_date: true,
      winners: {
        orderBy: { prize_position: "asc" },
        select: {
          id: true,
          prize_position: true,
          status: true,
          delivered_at: true,
          raffle_entries: { select: { ticket_number: true } },
          profiles: { select: { full_name: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const raffle = await loadResult((await params).id);
  return raffle
    ? { title: `Resultado: ${raffle.title}`, description: `Ganadores y verificación del sorteo ${raffle.title}.` }
    : { title: "Resultado no encontrado" };
}

export default async function RaffleResultPage({ params }: PageProps) {
  const raffle = await loadResult((await params).id);
  if (!raffle) notFound();

  const entries = await prisma.raffle_entries.findMany({
    where: eligibleEntriesWhere(raffle.id, raffle.entry_mode),
    select: { ticket_number: true },
    orderBy: { ticket_number: "asc" },
  });
  const tickets = entries.map((entry) => entry.ticket_number);
  const drawn = raffle.status !== "closed" && raffle.draw_seed;
  const legacy = drawn && raffle.draw_algorithm !== "sha256-v1";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <Link href="/resultados" className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
        <ArrowLeft className="size-4" aria-hidden /> Todos los resultados
      </Link>

      <header className="space-y-2">
        <Badge tone={drawn ? "info" : "warning"}>{drawn ? "Sorteo realizado" : "Cerrado, pendiente de sorteo"}</Badge>
        <h1 className="text-3xl font-extrabold">{raffle.title}</h1>
        <p className="text-[color:var(--muted-foreground)]">{raffle.prize_description}</p>
      </header>

      {drawn ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Ganadores</h2>
          <ul className="space-y-2">
            {raffle.winners.map((winner) => {
              const status = WINNER_STATUS[winner.status] ?? WINNER_STATUS.pending_contact;
              return (
                <li key={winner.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                        <Trophy className="size-5" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-semibold">{winner.prize_position}° lugar · {abbreviateName(winner.profiles?.full_name)}</span>
                        <span className="font-mono text-sm text-[color:var(--muted-foreground)]">Boleto #{winner.raffle_entries?.ticket_number}</span>
                      </span>
                    </span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <Notice tone="info" icon={Clock} title="El sorteo aún no se realiza">
          Está programado para el {formatDateTime(raffle.draw_date)}. Ya puedes ver el compromiso de la semilla y la lista de boletos que participan.
        </Notice>
      )}

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Fingerprint className="size-5 text-[color:var(--accent)]" aria-hidden /> Datos de verificación
        </h2>
        <Card className="divide-y divide-[color:var(--border)] text-sm">
          {[
            ["Modalidad", ENTRY_MODES[raffle.entry_mode]?.label ?? raffle.entry_mode],
            ["Cierre de participación", formatDateTime(raffle.closed_at)],
            ["Fecha de ejecución", drawn ? formatDateTime(raffle.drawn_at) : "Pendiente"],
            ["Boletos participantes", String(tickets.length)],
            ["Algoritmo", raffle.draw_algorithm ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2 p-4">
              <span className="text-[color:var(--muted-foreground)]">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
          <div className="space-y-1 p-4">
            <p className="text-[color:var(--muted-foreground)]">Compromiso (SHA-256 de la semilla, publicado al cierre)</p>
            <p className="break-all font-mono text-xs">{raffle.draw_commitment ?? "—"}</p>
          </div>
          <div className="space-y-1 p-4">
            <p className="text-[color:var(--muted-foreground)]">Huella de la lista de boletos (SHA-256)</p>
            <p className="break-all font-mono text-xs">{raffle.entries_hash ?? "—"}</p>
          </div>
          <div className="space-y-1 p-4">
            <p className="text-[color:var(--muted-foreground)]">Semilla revelada</p>
            <p className="break-all font-mono text-xs">{drawn ? raffle.draw_seed : "Se revela al ejecutar el sorteo"}</p>
          </div>
        </Card>

        {drawn && !legacy && raffle.draw_commitment && raffle.entries_hash && (
          <Card className="space-y-4 p-6">
            <div>
              <h3 className="font-bold">Compruébalo tú mismo</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Tu navegador repetirá el cálculo con la semilla y la lista de boletos publicadas. No se envía nada a nuestros servidores.
              </p>
            </div>
            <DrawVerifier
              seed={raffle.draw_seed!}
              commitment={raffle.draw_commitment}
              entriesHash={raffle.entries_hash}
              tickets={tickets}
              winningTickets={raffle.winners.map((winner) => winner.raffle_entries?.ticket_number ?? "")}
              raffleTitle={raffle.title}
            />
          </Card>
        )}
        {legacy && (
          <Notice tone="warning">Este sorteo se realizó con una versión anterior del sistema que no publicaba compromiso previo; no admite verificación automática.</Notice>
        )}

        <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <summary className="cursor-pointer font-semibold">Cómo funciona el algoritmo</summary>
          <ol className="prose-legal mt-4 space-y-2">
            <li>Al cerrar, el sistema genera una semilla aleatoria de 256 bits y publica su huella SHA-256 (el compromiso). Así no puede cambiarla después.</li>
            <li>También publica la huella de la lista de boletos participantes, ordenada y separada por saltos de línea.</li>
            <li>Al sortear, para cada puesto se calcula SHA-256(&quot;semilla:huella:puesto:intento&quot;). Los primeros 4 bytes forman un número; si cae en el rango sin sesgo, el ganador es el boleto en la posición (número mod boletos restantes).</li>
            <li>El boleto elegido sale de la lista y se repite para el siguiente puesto.</li>
          </ol>
        </details>

        <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <summary className="cursor-pointer font-semibold">Ver los {tickets.length} boletos participantes</summary>
          <p className="mt-4 max-h-72 overflow-y-auto break-words font-mono text-xs leading-6 text-[color:var(--muted-foreground)]">{tickets.join(" · ")}</p>
        </details>
      </section>
    </div>
  );
}
