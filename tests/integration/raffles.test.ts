import { beforeEach, describe, expect, it } from 'vitest';
import { actAs, createPaymentMethod, createRaffle, createUser, prisma, resetDatabase, uniqueReference } from './helpers';
import { createRaffle as createRaffleAction, deleteRaffle, setRaffleStatus, updateRaffle, type RaffleInput } from '../../src/lib/actions/admin';
import { executeRaffleDrawAction } from '../../src/app/(sorteo-live)/sorteo/[id]/ejecutar/actions';
import { createManualTransferPayment } from '../../src/app/(app)/app/sorteos/[id]/actions';
import { approveManualPayment } from '../../src/lib/payments/approve-manual-payment';
import { verifyDraw } from '../../src/lib/raffle/draw-algorithm';
import { createRaffleEntries } from '../../src/lib/raffle/entries';

beforeEach(resetDatabase);

// Fechas fijas para que dos llamadas a input() produzcan exactamente los mismos valores
const NOW = Date.now();

function input(overrides: Partial<RaffleInput> = {}): RaffleInput {
  const day = 86_400_000;
  const Date = { now: () => NOW } as const;
  return {
    title: 'Moto',
    description: null,
    prize_description: 'Una moto',
    prize_category: 'vehicles',
    image_url: null,
    start_date: new globalThis.Date(Date.now() - 1000).toISOString(),
    end_date: new globalThis.Date(Date.now() + 5 * day).toISOString(),
    draw_date: new globalThis.Date(Date.now() + 6 * day).toISOString(),
    entry_mode: 'tickets_only',
    total_winners: 2,
    max_entries_per_user: null,
    ticket_price: 3,
    ...overrides,
  };
}

async function addEntries(raffleId: string, users: Array<{ id: string }>, perUser = 2) {
  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      await createRaffleEntries(tx, { raffleId, userId: user.id, entrySource: 'manual_purchase', count: perUser });
    }
  });
}

describe('gestión de sorteos', () => {
  it('solo el admin crea y edita sorteos; staff y participantes reciben error', async () => {
    for (const role of ['participant', 'staff'] as const) {
      actAs(await createUser(role));
      expect((await createRaffleAction(input())).error).toBeTruthy();
    }
    actAs(await createUser('admin'));
    expect((await createRaffleAction(input())).error).toBeNull();
    expect(await prisma.raffles.count()).toBe(1);
  });

  it('valida fechas, precio y datos del premio', async () => {
    actAs(await createUser('admin'));
    expect((await createRaffleAction(input({ end_date: new Date(Date.now() + 10 * 86_400_000).toISOString() }))).error).toMatch(/después del cierre/);
    expect((await createRaffleAction(input({ ticket_price: null }))).error).toMatch(/precio/);
    expect((await createRaffleAction(input({ total_winners: 0 }))).error).toMatch(/ganadores/);
    expect((await createRaffleAction(input({ image_url: 'https://evil.com/x.png' }))).error).toMatch(/imagen/);
    expect((await createRaffleAction(input({ start_date: 'no-es-fecha' }))).error).toMatch(/no es válida/);
  });

  it('con participaciones no se pueden empeorar las condiciones', async () => {
    const admin = await createUser('admin');
    actAs(admin);
    await createRaffleAction(input({ status: 'active' }));
    const raffle = await prisma.raffles.findFirstOrThrow();
    await addEntries(raffle.id, [await createUser()]);

    actAs(admin);
    expect((await updateRaffle(raffle.id, input({ ticket_price: 5 }))).error).toMatch(/precio/);
    expect((await updateRaffle(raffle.id, input({ total_winners: 1 }))).error).toMatch(/reducir/);
    expect((await updateRaffle(raffle.id, input({ entry_mode: 'hybrid' }))).error).toMatch(/modalidad/);
    expect((await updateRaffle(raffle.id, input({ end_date: new Date(Date.now() + 86_400_000).toISOString() }))).error).toMatch(/postergarse/);
    // Mejoras para el participante sí se permiten
    expect((await updateRaffle(raffle.id, input({ total_winners: 3, title: 'Moto 0 km' }))).error).toBeNull();
    expect(await prisma.audit_logs.count({ where: { action: 'raffle.update' } })).toBe(1);
  });

  it('respeta la máquina de estados y no permite saltar a "drawn" ni borrar sorteos con historial', async () => {
    const admin = await createUser('admin');
    actAs(admin);
    await createRaffleAction(input());
    const raffle = await prisma.raffles.findFirstOrThrow();

    expect((await setRaffleStatus(raffle.id, 'drawn')).error).toBeTruthy();
    expect((await setRaffleStatus(raffle.id, 'closed')).error).toBeTruthy();
    expect((await setRaffleStatus(raffle.id, 'active')).error).toBeNull();
    await addEntries(raffle.id, [await createUser()]);
    actAs(admin);
    expect((await setRaffleStatus(raffle.id, 'draft')).error).toBeTruthy();
    expect((await deleteRaffle(raffle.id)).error).toBeTruthy();
    expect((await setRaffleStatus(raffle.id, 'closed')).error).toBeNull();
    expect((await setRaffleStatus(raffle.id, 'active')).error).toBeTruthy();
  });
});

describe('cierre y ejecución verificable', () => {
  async function closedRaffleWithEntries() {
    const admin = await createUser('admin');
    const participants = await Promise.all([createUser(), createUser(), createUser()]);
    const raffle = await createRaffle({ entry_mode: 'tickets_only', total_winners: 2 });
    await addEntries(raffle.id, participants, 3);
    actAs(admin);
    expect((await setRaffleStatus(raffle.id, 'closed')).error).toBeNull();
    return { admin, participants, raffle };
  }

  it('al cerrar publica el compromiso sin revelar la semilla', async () => {
    const { raffle } = await closedRaffleWithEntries();
    const closed = await prisma.raffles.findUniqueOrThrow({ where: { id: raffle.id } });
    expect(closed.draw_commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(closed.entries_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(closed.draw_seed).toBeNull();
    expect(await prisma.raffle_draw_secrets.count()).toBe(1);
  });

  it('después del cierre no se emiten boletos ni se aprueban pagos', async () => {
    const buyer = await createUser();
    const method = await createPaymentMethod();
    const raffle = await createRaffle();
    actAs(buyer);
    const request = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1 });
    actAs(await createUser('admin'));
    await setRaffleStatus(raffle.id, 'closed');

    actAs(await createUser('staff'));
    const approval = await approveManualPayment({ transactionId: request.transactionId as string });
    expect(approval.success).toBe(false);
    expect(await prisma.raffle_entries.count({ where: { raffle_id: raffle.id } })).toBe(0);
  });

  it('solo el admin ejecuta; el resultado es verificable y no se puede repetir en paralelo', async () => {
    const { admin, raffle } = await closedRaffleWithEntries();

    actAs(await createUser('staff'));
    expect((await executeRaffleDrawAction(raffle.id)).success).toBe(false);

    actAs(admin);
    const runs = await Promise.all([executeRaffleDrawAction(raffle.id), executeRaffleDrawAction(raffle.id)]);
    expect(runs.filter((r) => r.success)).toHaveLength(1);
    expect(await prisma.winners.count()).toBe(2);

    const drawn = await prisma.raffles.findUniqueOrThrow({ where: { id: raffle.id } });
    expect(drawn.status).toBe('drawn');
    const tickets = (await prisma.raffle_entries.findMany({ where: { raffle_id: raffle.id } })).map((e) => e.ticket_number);
    const winners = await prisma.winners.findMany({ where: { raffle_id: raffle.id }, include: { raffle_entries: true }, orderBy: { prize_position: 'asc' } });

    const verification = await verifyDraw({
      seed: drawn.draw_seed!,
      commitment: drawn.draw_commitment!,
      entriesHash: drawn.entries_hash!,
      ticketNumbers: tickets,
      winningTickets: winners.map((w) => w.raffle_entries!.ticket_number),
    });
    expect(verification).toMatchObject({ commitmentMatches: true, entriesHashMatches: true, winnersMatch: true });
    expect(await prisma.raffle_draw_secrets.count()).toBe(0);
  });

  it('detiene el sorteo si alguien alteró las participaciones después del cierre', async () => {
    const { admin, raffle } = await closedRaffleWithEntries();
    const intruder = await createUser();
    await prisma.raffle_entries.create({ data: { raffle_id: raffle.id, user_id: intruder.id, ticket_number: '999999', entry_source: 'manual_purchase' } });

    actAs(admin);
    const result = await executeRaffleDrawAction(raffle.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cambiaron/);
    expect(await prisma.winners.count()).toBe(0);
    expect(await prisma.audit_logs.count({ where: { action: 'raffle.draw_integrity_failed' } })).toBe(1);
  });

  it('en sorteos solo para suscriptores ignora los boletos comprados', async () => {
    const admin = await createUser('admin');
    const subscriber = await createUser();
    const buyer = await createUser();
    const raffle = await createRaffle({ entry_mode: 'subscribers_only', ticket_price: null });
    await prisma.$transaction(async (tx) => {
      await createRaffleEntries(tx, { raffleId: raffle.id, userId: subscriber.id, entrySource: 'subscription', count: 1 });
      await createRaffleEntries(tx, { raffleId: raffle.id, userId: buyer.id, entrySource: 'manual_purchase', count: 5 });
    });
    actAs(admin);
    await setRaffleStatus(raffle.id, 'closed');
    const result = await executeRaffleDrawAction(raffle.id);
    expect(result.success).toBe(true);
    expect(result.data!.winners.map((w) => w.user_id)).toEqual([subscriber.id]);
  });

  it('emite números de boleto únicos con compras simultáneas', async () => {
    const raffle = await createRaffle();
    const users = await Promise.all(Array.from({ length: 8 }, () => createUser()));
    await Promise.all(
      users.map((user) =>
        prisma.$transaction((tx) => createRaffleEntries(tx, { raffleId: raffle.id, userId: user.id, entrySource: 'manual_purchase', count: 3 })),
      ),
    );
    const numbers = (await prisma.raffle_entries.findMany({ where: { raffle_id: raffle.id } })).map((e) => e.ticket_number);
    expect(numbers).toHaveLength(24);
    expect(new Set(numbers).size).toBe(24);
  });
});
