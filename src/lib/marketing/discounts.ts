import 'server-only';

import { Prisma } from '@prisma/client';
import { fromCents, toCents } from '../payments/money';

type Tx = Prisma.TransactionClient;

export type DiscountScope = 'raffles' | 'plans';

export class DiscountError extends Error {}

export function normalizeDiscountCode(code: string | null | undefined) {
  return String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

type DiscountCodeRow = {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  applies_to: string;
  raffle_id: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  valid_from: Date | null;
  valid_until: Date | null;
  is_active: boolean;
  owner_user_id: string | null;
};

/** Descuento en centavos para un subtotal; nunca deja el total en cero */
export function computeDiscountCents(code: Pick<DiscountCodeRow, 'discount_type' | 'value'>, subtotalCents: number) {
  const raw = code.discount_type === 'percent'
    ? Math.round((subtotalCents * code.value) / 100)
    : toCents(code.value);
  return Math.max(0, Math.min(raw, subtotalCents - 1));
}

/**
 * Valida un código para un usuario y una compra. Con `lock: true` bloquea la fila del código
 * para que dos pagos simultáneos no superen su límite de usos.
 */
export async function resolveDiscount(
  tx: Tx,
  params: { code: string; userId: string; scope: DiscountScope; raffleId?: string | null; subtotal: number; lock?: boolean },
) {
  const normalized = normalizeDiscountCode(params.code);
  if (!normalized) throw new DiscountError('Ingresa un código de descuento.');
  if (normalized.length > 40) throw new DiscountError('El código de descuento no es válido.');

  const rows = params.lock
    ? await tx.$queryRaw<DiscountCodeRow[]>`
        SELECT id, code, discount_type, value, applies_to, raffle_id, max_uses, max_uses_per_user,
               valid_from, valid_until, is_active, owner_user_id
        FROM discount_codes WHERE code = ${normalized} FOR UPDATE`
    : await tx.discount_codes.findMany({ where: { code: normalized } });
  const code = rows[0] as DiscountCodeRow | undefined;

  const now = new Date();
  if (!code || !code.is_active) throw new DiscountError('El código de descuento no existe o no está activo.');
  if (code.owner_user_id && code.owner_user_id !== params.userId) throw new DiscountError('Este código es personal y no está a tu nombre.');
  if (code.valid_from && code.valid_from > now) throw new DiscountError('Este código todavía no está vigente.');
  if (code.valid_until && code.valid_until < now) throw new DiscountError('Este código ya expiró.');
  if (code.applies_to !== 'all' && code.applies_to !== params.scope) {
    throw new DiscountError(code.applies_to === 'plans' ? 'Este código solo aplica a planes.' : 'Este código solo aplica a boletos de sorteos.');
  }
  if (code.raffle_id && code.raffle_id !== params.raffleId) throw new DiscountError('Este código no aplica a este sorteo.');

  const activeUse = { code_id: code.id, status: { in: ['pending', 'confirmed'] } };
  const [totalUses, userUses] = await Promise.all([
    tx.discount_redemptions.count({ where: activeUse }),
    tx.discount_redemptions.count({ where: { ...activeUse, user_id: params.userId } }),
  ]);
  if (code.max_uses !== null && totalUses >= code.max_uses) throw new DiscountError('Este código ya alcanzó su límite de usos.');
  if (userUses >= code.max_uses_per_user) throw new DiscountError('Ya usaste este código el máximo de veces permitido.');

  const subtotalCents = toCents(params.subtotal);
  const discountCents = computeDiscountCents(code, subtotalCents);

  return {
    codeId: code.id,
    code: code.code,
    discount: fromCents(discountCents),
    total: fromCents(subtotalCents - discountCents),
    label: code.discount_type === 'percent' ? `${code.value}% de descuento` : `${fromCents(toCents(code.value)).toFixed(2)} USD de descuento`,
  };
}
