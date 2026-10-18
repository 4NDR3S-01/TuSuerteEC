import { beforeEach, describe, expect, it } from 'vitest';
import { actAs, createPaymentMethod, createRaffle, createUser, prisma, resetDatabase, uniqueReference } from './helpers';
import { createManualTransferPayment } from '../../src/app/(app)/app/sorteos/[id]/actions';
import { approveManualPayment, rejectManualPayment } from '../../src/lib/payments/approve-manual-payment';
import { createPlanManualPayment } from '../../src/lib/actions/subscriptions';
import { createDiscountCode } from '../../src/lib/actions/admin-marketing';

beforeEach(resetDatabase);

describe('solicitudes de pago de boletos', () => {
  it('calcula el monto en el servidor y rechaza montos manipulados', async () => {
    const user = await createUser();
    const method = await createPaymentMethod();
    const raffle = await createRaffle({ ticket_price: 2.5 });
    actAs(user);

    const tampered = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 4, amount: 0.01 });
    expect(tampered.success).toBe(false);

    const ok = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 4 });
    expect(ok).toMatchObject({ success: true, amount: 10, tickets: 4 });
  });

  it('no vende boletos en sorteos solo para suscriptores, cerrados o vencidos', async () => {
    const user = await createUser();
    const method = await createPaymentMethod();
    actAs(user);

    const subscribersOnly = await createRaffle({ entry_mode: 'subscribers_only', ticket_price: null });
    const closed = await createRaffle({ status: 'closed' });
    const expired = await createRaffle({ end_date: new Date(Date.now() - 1000) });

    for (const raffle of [subscribersOnly, closed, expired]) {
      const result = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1 });
      expect(result.success).toBe(false);
    }
  });

  it('no acepta métodos de pago fuera de su alcance ni comprobantes ajenos', async () => {
    const user = await createUser();
    const other = await createUser();
    const plansOnly = await createPaymentMethod(['plans']);
    const method = await createPaymentMethod(['raffles'], true);
    const raffle = await createRaffle();

    const foreignFile = '0b1f7d2e-3c4a-4b5c-8d9e-0f1a2b3c4d5e.png';
    await prisma.uploads.create({ data: { owner_id: other.id, folder: 'payment-receipts', file_name: foreignFile, mime_type: 'image/png', size: 10 } });

    actAs(user);
    expect((await createManualTransferPayment(raffle.id, { paymentMethodId: plansOnly.id, reference: uniqueReference(), tickets: 1 })).success).toBe(false);
    const stolenReceipt = await createManualTransferPayment(raffle.id, {
      paymentMethodId: method.id,
      reference: uniqueReference(),
      tickets: 1,
      receiptUrl: `/api/files/payment-receipts/${foreignFile}`,
    });
    expect(stolenReceipt).toMatchObject({ success: false });
    expect(stolenReceipt.error).toMatch(/comprobante/i);
  });

  it('respeta el máximo de participaciones contando los pagos pendientes', async () => {
    const user = await createUser();
    const method = await createPaymentMethod();
    const raffle = await createRaffle({ max_entries_per_user: 3 });
    actAs(user);

    expect((await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 2 })).success).toBe(true);
    const exceeded = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 2 });
    expect(exceeded.success).toBe(false);
    expect((await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1 })).success).toBe(true);
  });

  it('no permite reutilizar el mismo número de comprobante, aunque se envíe en paralelo', async () => {
    const [a, b] = [await createUser(), await createUser()];
    const method = await createPaymentMethod();
    const raffle = await createRaffle();
    const reference = 'COMPROBANTE-123';

    actAs(a);
    const results = await Promise.all([
      createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference, tickets: 1 }),
      createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: reference.toLowerCase(), tickets: 1 }),
    ]);
    expect(results.filter((r) => r.success)).toHaveLength(1);

    actAs(b);
    expect((await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference, tickets: 1 })).success).toBe(false);
  });
});

describe('revisión de pagos', () => {
  async function pendingPayment(tickets = 2) {
    const buyer = await createUser();
    const method = await createPaymentMethod();
    const raffle = await createRaffle();
    actAs(buyer);
    const request = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets });
    return { buyer, raffle, transactionId: request.transactionId as string };
  }

  it('un participante no puede aprobar pagos (ni el suyo)', async () => {
    const { buyer, transactionId } = await pendingPayment();
    actAs(buyer);
    const result = await approveManualPayment({ transactionId });
    expect(result.success).toBe(false);
    expect(await prisma.raffle_entries.count()).toBe(0);
  });

  it('el staff aprueba, se emiten los boletos vinculados al pago y no se puede aprobar dos veces en paralelo', async () => {
    const { transactionId } = await pendingPayment(3);
    const [staffA, staffB] = [await createUser('staff'), await createUser('staff')];

    actAs(staffA);
    const first = approveManualPayment({ transactionId });
    actAs(staffB);
    const second = approveManualPayment({ transactionId });
    const results = await Promise.all([first, second]);

    expect(results.filter((r) => r.success)).toHaveLength(1);
    const entries = await prisma.raffle_entries.findMany({ orderBy: { ticket_number: 'asc' } });
    expect(entries.map((e) => e.ticket_number)).toEqual(['000001', '000002', '000003']);
    expect(entries.every((e) => e.payment_transaction_id === transactionId)).toBe(true);
    expect(await prisma.audit_logs.count({ where: { action: 'payment.approve' } })).toBe(1);
  });

  it('nadie revisa sus propios pagos (separación de funciones)', async () => {
    const admin = await createUser('admin');
    const method = await createPaymentMethod();
    const raffle = await createRaffle();
    actAs(admin);
    const request = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1 });
    const result = await approveManualPayment({ transactionId: request.transactionId as string });
    expect(result).toMatchObject({ success: false });
    expect(result.error).toMatch(/propio/);
  });

  it('el rechazo exige motivo y libera el código de descuento', async () => {
    const admin = await createUser('admin');
    actAs(admin);
    expect((await createDiscountCode({ code: 'PROMO10', description: null, discount_type: 'percent', value: 10, applies_to: 'all', raffle_id: null, max_uses: 1, max_uses_per_user: 1, valid_from: null, valid_until: null, is_active: true })).success).toBe(true);

    const buyer = await createUser();
    const method = await createPaymentMethod();
    const raffle = await createRaffle({ ticket_price: 10 });
    actAs(buyer);
    const request = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1, discountCode: 'promo10' });
    expect(request).toMatchObject({ success: true, amount: 9 });

    actAs(admin);
    expect((await rejectManualPayment({ transactionId: request.transactionId as string, rejectionReason: '' })).success).toBe(false);
    expect((await rejectManualPayment({ transactionId: request.transactionId as string, rejectionReason: 'Comprobante ilegible' })).success).toBe(true);
    expect(await prisma.discount_redemptions.findFirst()).toMatchObject({ status: 'released' });

    actAs(buyer);
    const retry = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1, discountCode: 'PROMO10' });
    expect(retry).toMatchObject({ success: true, amount: 9 });
  });
});

describe('códigos de descuento', () => {
  it('no supera el límite de usos con solicitudes simultáneas', async () => {
    const admin = await createUser('admin');
    actAs(admin);
    await createDiscountCode({ code: 'UNICO', description: null, discount_type: 'fixed', value: 1, applies_to: 'raffles', raffle_id: null, max_uses: 1, max_uses_per_user: 1, valid_from: null, valid_until: null, is_active: true });

    const method = await createPaymentMethod();
    const raffle = await createRaffle();
    const buyers = await Promise.all([createUser(), createUser(), createUser()]);

    const results = await Promise.all(
      buyers.map(async (buyer) => {
        actAs(buyer);
        return createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1, discountCode: 'UNICO' });
      }),
    );
    // Cada llamada captura su sesión antes del primer await, así que son tres usuarios distintos
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success).every((r) => /límite de usos/.test(r.error ?? ''))).toBe(true);
    expect(await prisma.discount_redemptions.count({ where: { status: { in: ['pending', 'confirmed'] } } })).toBe(1);
  });

  it('respeta alcance, vigencia y códigos personales', async () => {
    const admin = await createUser('admin');
    actAs(admin);
    await createDiscountCode({ code: 'PLANES', description: null, discount_type: 'percent', value: 20, applies_to: 'plans', raffle_id: null, max_uses: null, max_uses_per_user: 1, valid_from: null, valid_until: null, is_active: true });
    await createDiscountCode({ code: 'VENCIDO', description: null, discount_type: 'percent', value: 20, applies_to: 'all', raffle_id: null, max_uses: null, max_uses_per_user: 1, valid_from: '2020-01-01', valid_until: '2020-02-01', is_active: true });
    const owner = await createUser();
    await prisma.discount_codes.create({ data: { code: 'REF-PERSONAL', discount_type: 'percent', value: 10, owner_user_id: owner.id, source: 'referral', max_uses: 1 } });

    const buyer = await createUser();
    const method = await createPaymentMethod();
    const raffle = await createRaffle();
    actAs(buyer);
    for (const code of ['PLANES', 'VENCIDO', 'REF-PERSONAL', 'NOEXISTE']) {
      const result = await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1, discountCode: code });
      expect(result.success, code).toBe(false);
    }
  });
});

describe('suscripciones y referidos', () => {
  it('aprobar un plan activa la suscripción, inscribe en sorteos y premia al referidor una sola vez', async () => {
    const referrer = await createUser();
    const referred = await createUser('participant', { referredBy: referrer.id });
    const staff = await createUser('staff');
    const method = await createPaymentMethod();
    const plan = await prisma.plans.create({ data: { name: 'Básico', price: 5, interval: 'month' } });
    const raffle = await createRaffle({ entry_mode: 'hybrid' });

    actAs(referred);
    const request = await createPlanManualPayment(plan.id, { paymentMethodId: method.id, reference: uniqueReference() });
    expect(request.success).toBe(true);
    expect((await createPlanManualPayment(plan.id, { paymentMethodId: method.id, reference: uniqueReference() })).success).toBe(false);

    const transaction = await prisma.payment_transactions.findFirstOrThrow({ where: { user_id: referred.id } });
    actAs(staff);
    expect((await approveManualPayment({ transactionId: transaction.id })).success).toBe(true);

    expect(await prisma.subscriptions.count({ where: { user_id: referred.id, status: 'active' } })).toBe(1);
    expect(await prisma.raffle_entries.count({ where: { raffle_id: raffle.id, user_id: referred.id, entry_source: 'subscription' } })).toBe(1);
    const reward = await prisma.referral_rewards.findUniqueOrThrow({ where: { referred_user_id: referred.id }, include: { discount_codes: true } });
    expect(reward.referrer_id).toBe(referrer.id);
    expect(reward.discount_codes).toMatchObject({ owner_user_id: referrer.id, value: 10, max_uses: 1 });

    // Segundo pago aprobado del referido: no hay una segunda recompensa
    actAs(referred);
    await createManualTransferPayment(raffle.id, { paymentMethodId: method.id, reference: uniqueReference(), tickets: 1 });
    const second = await prisma.payment_transactions.findFirstOrThrow({ where: { user_id: referred.id, status: 'pending' } });
    actAs(staff);
    await approveManualPayment({ transactionId: second.id });
    expect(await prisma.referral_rewards.count()).toBe(1);
  });
});
