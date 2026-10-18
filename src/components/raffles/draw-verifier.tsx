'use client';

import { useState } from 'react';
import { CheckCircle2, Download, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { verifyDraw, type DrawVerification } from '../../lib/raffle/draw-algorithm';
import { Button, Notice } from '../ui/kit';

type Props = {
  seed: string;
  commitment: string;
  entriesHash: string;
  tickets: string[];
  winningTickets: string[];
  raffleTitle: string;
};

/** Repite el cálculo del sorteo en el navegador del visitante, sin depender del servidor */
export function DrawVerifier({ seed, commitment, entriesHash, tickets, winningTickets, raffleTitle }: Props) {
  const [result, setResult] = useState<DrawVerification | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      setResult(await verifyDraw({ seed, commitment, entriesHash, ticketNumbers: tickets, winningTickets }));
    } finally {
      setRunning(false);
    }
  };

  const download = () => {
    const content = [
      `Sorteo: ${raffleTitle}`,
      `Algoritmo: sha256-v1`,
      `Semilla: ${seed}`,
      `Compromiso (SHA-256 de la semilla): ${commitment}`,
      `Huella de boletos (SHA-256): ${entriesHash}`,
      `Ganadores en orden: ${winningTickets.join(', ')}`,
      '',
      'Boletos participantes (ordenados):',
      ...tickets,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sorteo-verificacion.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const checks = result
    ? [
        { ok: result.commitmentMatches, label: 'La semilla revelada coincide con el compromiso publicado al cierre' },
        { ok: result.entriesHashMatches, label: 'La lista de boletos es la misma que se fijó al cierre' },
        { ok: result.winnersMatch, label: 'Los ganadores coinciden con los que produce el algoritmo' },
      ]
    : [];
  const allOk = checks.length > 0 && checks.every((check) => check.ok);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
          {running ? 'Verificando…' : 'Verificar en mi navegador'}
        </Button>
        <Button variant="secondary" onClick={download}>
          <Download aria-hidden /> Descargar datos
        </Button>
      </div>

      {result && (
        <div aria-live="polite" className="space-y-3">
          <ul className="space-y-2 text-sm">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2">
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-[color:var(--danger)]" aria-hidden />
                )}
                <span>{check.label}</span>
              </li>
            ))}
          </ul>
          <Notice tone={allOk ? 'success' : 'danger'} title={allOk ? 'Resultado verificado' : 'La verificación falló'}>
            {allOk
              ? `Tu navegador obtuvo los mismos ganadores: ${result.recomputedWinners.join(', ')}.`
              : 'Los datos publicados no coinciden. Escríbenos para revisarlo.'}
          </Notice>
        </div>
      )}
    </div>
  );
}
