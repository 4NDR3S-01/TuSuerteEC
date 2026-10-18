'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, Loader2, ShieldCheck, Ticket, Trophy } from 'lucide-react';
import { executeRaffleDrawAction } from '../../app/(sorteo-live)/sorteo/[id]/ejecutar/actions';
import { abbreviateName, formatDateTime, prizeCategory } from '../../lib/raffle/labels';
import { Button, ButtonLink } from '../ui/kit';

type Raffle = {
  id: string;
  title: string;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  status: string;
  total_winners: number;
  draw_date: string | null;
  draw_seed: string | null;
  draw_commitment: string | null;
  entries_hash: string | null;
};

type Winner = {
  entry_id: string;
  user_id: string;
  ticket_number: string;
  prize_position: number;
  user_name?: string;
};

type Props = {
  raffle: Raffle;
  stats: { totalEntries: number; totalWinners: number };
  existingWinners?: Winner[];
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pantalla para ejecutar el sorteo en vivo (pensada para proyectar o transmitir).
 * El cálculo ocurre en el servidor; aquí solo se muestra la cuenta regresiva y se revelan los ganadores.
 * En pantalla se muestra el nombre abreviado del ganador para proteger su privacidad.
 */
export function RaffleExecution({ raffle, stats, existingWinners = [] }: Props) {
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'drawing' | 'done'>(existingWinners.length > 0 ? 'done' : 'ready');
  const [countdown, setCountdown] = useState(5);
  const [winners, setWinners] = useState<Winner[]>(existingWinners);
  const [revealed, setRevealed] = useState(existingWinners.length);
  const [seed, setSeed] = useState(raffle.draw_seed);
  const [error, setError] = useState<string | null>(null);
  const category = prizeCategory(raffle.prize_category);

  const canDraw = raffle.status === 'closed' && stats.totalEntries > 0 && phase === 'ready';

  const start = async () => {
    setError(null);
    setPhase('countdown');
    for (let i = 5; i > 0; i -= 1) {
      setCountdown(i);
      await wait(1000);
    }
    setPhase('drawing');
    const result = await executeRaffleDrawAction(raffle.id);
    if (!result.success || !result.data) {
      setError(result.error ?? 'No se pudo ejecutar el sorteo.');
      setPhase('ready');
      return;
    }
    setSeed(result.data.drawSeed);
    setWinners(result.data.winners);
    setRevealed(0);
    setPhase('done');
    for (let i = 1; i <= result.data.winners.length; i += 1) {
      await wait(2500);
      setRevealed(i);
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--hero-gradient)' }}>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/administrador/sorteos" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden /> Volver al panel
          </Link>
          <span className="text-sm text-white/60">TuSuerte · Sorteo en vivo</span>
        </div>

        <header className="flex flex-col items-center gap-4 text-center">
          {raffle.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={raffle.image_url} alt="" className="size-28 rounded-3xl object-cover ring-4 ring-white/10" />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-3xl bg-white/10">
              <category.icon className="size-12 text-orange-300" aria-hidden />
            </span>
          )}
          <h1 className="text-3xl font-extrabold sm:text-5xl">{raffle.title}</h1>
          <p className="text-lg text-white/75">{raffle.prize_description}</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5"><Ticket className="size-4" aria-hidden /> {stats.totalEntries} boletos</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5"><Trophy className="size-4" aria-hidden /> {raffle.total_winners} ganador(es)</span>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6" aria-live="polite">
          {phase === 'ready' && (
            <>
              {raffle.status !== 'closed' ? (
                <p className="max-w-md text-center text-white/75">
                  {raffle.status === 'active' ? 'Cierra la participación desde el panel antes de ejecutar el sorteo.' : 'Este sorteo no está listo para ejecutarse.'}
                </p>
              ) : stats.totalEntries === 0 ? (
                <p className="text-white/75">No hay boletos participantes.</p>
              ) : (
                <Button size="lg" onClick={start} disabled={!canDraw} className="h-16 px-10 text-lg">
                  <Trophy aria-hidden /> Iniciar sorteo
                </Button>
              )}
              {error && <p role="alert" className="max-w-lg rounded-xl bg-red-500/20 px-4 py-3 text-center text-sm">{error}</p>}
            </>
          )}

          {phase === 'countdown' && <p className="font-display text-[10rem] font-extrabold leading-none tabular-nums text-orange-300">{countdown}</p>}

          {phase === 'drawing' && (
            <p className="flex items-center gap-3 text-xl"><Loader2 className="size-6 animate-spin" aria-hidden /> Calculando ganadores…</p>
          )}

          {phase === 'done' && (
            <ol className="w-full max-w-xl space-y-3">
              {winners.map((winner, index) => (
                <li
                  key={winner.entry_id}
                  className={`flex items-center justify-between gap-4 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 transition-all duration-700 ${index < revealed ? 'opacity-100' : 'translate-y-2 opacity-0'}`}
                >
                  <span className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-orange-400 font-display text-xl font-extrabold text-slate-900">{winner.prize_position}°</span>
                    <span className="text-xl font-bold">{abbreviateName(winner.user_name)}</span>
                  </span>
                  <span className="font-mono text-2xl font-bold">#{winner.ticket_number}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="space-y-3 rounded-2xl bg-black/20 p-5 text-xs text-white/70">
          <p className="flex items-center gap-2 font-semibold text-white"><Fingerprint className="size-4" aria-hidden /> Datos de verificación</p>
          <p className="break-all font-mono">Compromiso publicado al cierre: {raffle.draw_commitment ?? '—'}</p>
          <p className="break-all font-mono">Huella de boletos: {raffle.entries_hash ?? '—'}</p>
          <p className="break-all font-mono">Semilla: {seed ?? 'se revela al ejecutar'}</p>
          <p>Fecha programada: {formatDateTime(raffle.draw_date)}</p>
          {phase === 'done' && (
            <ButtonLink href={`/resultados/${raffle.id}`} variant="onDark" size="sm">
              <ShieldCheck aria-hidden /> Página pública de verificación
            </ButtonLink>
          )}
        </footer>
      </div>
    </div>
  );
}
