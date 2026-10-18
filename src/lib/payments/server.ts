import 'server-only';

import { prisma, toPlain } from '../db';
import type { PaymentMethod, PaymentScope } from './types';

export async function fetchActivePaymentMethods(scope: PaymentScope): Promise<PaymentMethod[]> {
  const methods = await prisma.payment_methods.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });

  return toPlain(methods).filter((method) => {
    const config = (method.config ?? {}) as { scopes?: unknown };
    const scopes: string[] = Array.isArray(config.scopes) ? config.scopes : [];
    return scopes.includes(scope);
  }) as PaymentMethod[];
}

export async function fetchPaymentMethodById(id: string): Promise<PaymentMethod | null> {
  const method = await prisma.payment_methods.findUnique({ where: { id } });
  return method ? (toPlain(method) as PaymentMethod) : null;
}
