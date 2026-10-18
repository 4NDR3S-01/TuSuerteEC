import { randomUUID } from 'node:crypto';
import { sessionState } from './setup';
import { prisma } from '../../src/lib/db';

export { prisma };

let counter = 0;

/** Cédula válida (módulo 10) distinta en cada llamada */
function makeCedula() {
  for (;;) {
    counter += 1;
    const base = `17${String(Math.floor(Math.random() * 1e7) + counter).padStart(7, '0').slice(-7)}`;
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const sum = base.split('').reduce((acc, digit, i) => {
      const product = Number(digit) * coefficients[i];
      return acc + (product >= 10 ? product - 9 : product);
    }, 0);
    const verifier = (10 - (sum % 10)) % 10;
    return `${base}${verifier}`;
  }
}

export async function resetDatabase() {
  const tables = [
    'audit_logs', 'discount_redemptions', 'referral_rewards', 'discount_codes', 'raffle_favorites', 'uploads',
    'raffle_draw_secrets', 'winners', 'raffle_entries', 'payment_transactions', 'subscriptions', 'live_events',
    'notifications', 'raffles', 'plans', 'payment_methods', 'password_reset_tokens', 'profiles', 'users', 'app_settings',
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function createUser(role: 'participant' | 'staff' | 'admin' = 'participant', overrides: { referredBy?: string } = {}) {
  const id = randomUUID();
  const email = `${role}-${id.slice(0, 8)}@test.local`;
  await prisma.users.create({
    data: {
      id,
      email,
      password_hash: '$2b$10$U18UBEX67bnc2cNL0BplIu4wmgzohE11NSpe5clEIw8vtB6UFxkva',
      profile: {
        create: {
          full_name: `Usuario ${role} ${id.slice(0, 4)}`,
          id_number: makeCedula(),
          phone_number: '0999999999',
          email,
          address: 'Quito',
          role,
          referral_code: id.slice(0, 8).toUpperCase(),
          referred_by: overrides.referredBy ?? null,
        },
      },
    },
  });
  return { id, email, role };
}

export function actAs(user: { id: string; role: string; email?: string } | null, sessionVersion = 0) {
  sessionState.current = user
    ? { user: { id: user.id, role: user.role, sessionVersion, email: user.email ?? '', name: 'Test' } }
    : null;
}

export async function createPaymentMethod(scopes: string[] = ['raffles', 'plans'], requiresProof = false) {
  return prisma.payment_methods.create({
    data: {
      name: 'Transferencia de prueba',
      type: 'manual_transfer',
      config: { scopes, currency: 'USD', manual: { bankName: 'Banco', accountNumber: '123', requiresProof } },
    },
  });
}

export async function createRaffle(overrides: Partial<Parameters<typeof prisma.raffles.create>[0]['data']> = {}) {
  const now = Date.now();
  return prisma.raffles.create({
    data: {
      title: 'Sorteo de prueba',
      prize_description: 'Premio',
      start_date: new Date(now - 60_000),
      end_date: new Date(now + 7 * 86_400_000),
      draw_date: new Date(now + 8 * 86_400_000),
      status: 'active',
      entry_mode: 'hybrid',
      total_winners: 1,
      ticket_price: 2,
      ...overrides,
    },
  });
}

let referenceCounter = 0;
export function uniqueReference() {
  referenceCounter += 1;
  return `REF-${Date.now()}-${referenceCounter}`;
}
