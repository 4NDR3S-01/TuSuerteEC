/**
 * Algoritmo de selección de ganadores verificable ("sha256-v1").
 *
 * Funciona igual en el servidor (Node) y en el navegador (Web Crypto), para que cualquier persona
 * pueda recalcular el resultado desde la página pública del sorteo.
 *
 * Procedimiento:
 *  1. Al cerrar el sorteo se genera una semilla secreta de 256 bits y se publica su huella
 *     `compromiso = SHA-256(semilla)`. También se publica `huellaBoletos = SHA-256(boletos)`, donde
 *     `boletos` son los números participantes ordenados y unidos por "\n".
 *  2. Al ejecutar el sorteo se revela la semilla. Para cada puesto p = 1..k se calcula
 *     `h = SHA-256("semilla:huellaBoletos:p:intento")`, se toman sus primeros 4 bytes como entero sin
 *     signo `x` y, si `x` cae dentro del mayor múltiplo de `n` (boletos restantes) menor que 2^32,
 *     el ganador es el boleto restante en la posición `x mod n`; si no, se repite con `intento + 1`
 *     (muestreo por rechazo: sin sesgo de módulo). El boleto elegido sale de la lista.
 *
 * Como el compromiso se publica antes de conocer la semilla y la lista de boletos queda fija al cierre,
 * nadie puede elegir una semilla a conveniencia después de ver los participantes.
 */

export const DRAW_ALGORITHM = 'sha256-v1';

const UINT32_RANGE = 2 ** 32;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(text: string): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await sha256(text));
}

/** Normaliza la lista de boletos: únicos y ordenados de forma estable */
export function normalizeTickets(ticketNumbers: readonly string[]): string[] {
  return Array.from(new Set(ticketNumbers)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export async function computeEntriesHash(ticketNumbers: readonly string[]): Promise<string> {
  return sha256Hex(normalizeTickets(ticketNumbers).join('\n'));
}

export async function computeCommitment(seed: string): Promise<string> {
  return sha256Hex(seed);
}

/** Genera una semilla de 256 bits en hexadecimal */
export function generateSeed(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Devuelve los números de boleto ganadores en orden de puesto (1°, 2°, ...) */
export async function selectWinningTickets(
  ticketNumbers: readonly string[],
  winnersCount: number,
  seed: string,
): Promise<string[]> {
  const remaining = normalizeTickets(ticketNumbers);
  const entriesHash = await computeEntriesHash(remaining);
  const total = Math.min(Math.max(0, Math.floor(winnersCount)), remaining.length);
  const winners: string[] = [];

  for (let position = 1; position <= total; position += 1) {
    const n = remaining.length;
    const limit = UINT32_RANGE - (UINT32_RANGE % n);

    for (let attempt = 0; ; attempt += 1) {
      const digest = new DataView(await sha256(`${seed}:${entriesHash}:${position}:${attempt}`));
      const value = digest.getUint32(0);
      if (value < limit) {
        const [winner] = remaining.splice(value % n, 1);
        winners.push(winner);
        break;
      }
    }
  }

  return winners;
}

export type DrawVerification = {
  commitmentMatches: boolean;
  entriesHashMatches: boolean;
  winnersMatch: boolean;
  recomputedWinners: string[];
};

/** Recalcula un sorteo publicado y compara cada dato con lo registrado */
export async function verifyDraw(params: {
  seed: string;
  commitment: string;
  entriesHash: string;
  ticketNumbers: readonly string[];
  winningTickets: readonly string[];
}): Promise<DrawVerification> {
  const [commitment, entriesHash, recomputedWinners] = await Promise.all([
    computeCommitment(params.seed),
    computeEntriesHash(params.ticketNumbers),
    selectWinningTickets(params.ticketNumbers, params.winningTickets.length, params.seed),
  ]);

  return {
    commitmentMatches: commitment === params.commitment,
    entriesHashMatches: entriesHash === params.entriesHash,
    winnersMatch: recomputedWinners.join(',') === params.winningTickets.join(','),
    recomputedWinners,
  };
}
