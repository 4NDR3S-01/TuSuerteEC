import { describe, expect, it } from 'vitest';
import {
  computeCommitment,
  computeEntriesHash,
  generateSeed,
  normalizeTickets,
  selectWinningTickets,
  verifyDraw,
} from '../../src/lib/raffle/draw-algorithm';

const tickets = Array.from({ length: 50 }, (_, i) => String(i + 1).padStart(6, '0'));

describe('algoritmo de sorteo sha256-v1', () => {
  it('es determinístico para la misma semilla y lista de boletos', async () => {
    const seed = 'a'.repeat(64);
    const first = await selectWinningTickets(tickets, 3, seed);
    const second = await selectWinningTickets([...tickets].reverse(), 3, seed);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
  });

  it('no repite ganadores y todos pertenecen a la lista', async () => {
    const winners = await selectWinningTickets(tickets, 10, generateSeed());
    expect(new Set(winners).size).toBe(10);
    winners.forEach((ticket) => expect(tickets).toContain(ticket));
  });

  it('nunca entrega más ganadores que boletos', async () => {
    expect(await selectWinningTickets(['000001', '000002'], 5, generateSeed())).toHaveLength(2);
    expect(await selectWinningTickets([], 3, generateSeed())).toEqual([]);
  });

  it('cambia el resultado si cambia la semilla', async () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i += 1) results.add((await selectWinningTickets(tickets, 1, generateSeed()))[0]);
    expect(results.size).toBeGreaterThan(5);
  });

  it('reparte de forma aproximadamente uniforme (sin sesgo evidente)', async () => {
    const small = ['000001', '000002', '000003'];
    const counts: Record<string, number> = {};
    const runs = 1500;
    for (let i = 0; i < runs; i += 1) {
      const [winner] = await selectWinningTickets(small, 1, generateSeed());
      counts[winner] = (counts[winner] ?? 0) + 1;
    }
    for (const ticket of small) {
      expect(counts[ticket] / runs).toBeGreaterThan(0.27);
      expect(counts[ticket] / runs).toBeLessThan(0.4);
    }
  });

  it('la huella de boletos ignora el orden y los duplicados', async () => {
    expect(await computeEntriesHash(['000002', '000001'])).toBe(await computeEntriesHash(['000001', '000002', '000001']));
    expect(normalizeTickets(['b', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('verifica un sorteo correcto y detecta manipulaciones', async () => {
    const seed = generateSeed();
    const commitment = await computeCommitment(seed);
    const entriesHash = await computeEntriesHash(tickets);
    const winningTickets = await selectWinningTickets(tickets, 2, seed);

    const ok = await verifyDraw({ seed, commitment, entriesHash, ticketNumbers: tickets, winningTickets });
    expect(ok).toMatchObject({ commitmentMatches: true, entriesHashMatches: true, winnersMatch: true });

    const otherSeed = await verifyDraw({ seed: generateSeed(), commitment, entriesHash, ticketNumbers: tickets, winningTickets });
    expect(otherSeed.commitmentMatches).toBe(false);

    const addedTicket = await verifyDraw({ seed, commitment, entriesHash, ticketNumbers: [...tickets, '000051'], winningTickets });
    expect(addedTicket.entriesHashMatches).toBe(false);

    const swappedWinner = await verifyDraw({ seed, commitment, entriesHash, ticketNumbers: tickets, winningTickets: ['000001', '000002'] });
    expect(swappedWinner.winnersMatch).toBe(winningTickets.join() === '000001,000002');
  });

  it('genera semillas de 256 bits', () => {
    expect(generateSeed()).toMatch(/^[0-9a-f]{64}$/);
  });
});
