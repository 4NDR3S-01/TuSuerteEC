'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../db';
import { getCurrentUser } from '../auth/get-user';
import { checkRateLimit } from '../security/rate-limit';
import { PaymentRequestError, createPlanPaymentRequest, previewDiscount } from '../payments/requests';

// Forma plana (sin unión discriminada) porque el proyecto compila con `strict: false`
type ActionResult = { success: boolean; message?: string; error?: string; amount?: number };

export type PlanManualPaymentPayload = {
  paymentMethodId: string;
  reference: string;
  receiptUrl?: string;
  notes?: string;
  discountCode?: string;
};

/**
 * Registra una solicitud de suscripción pagada por transferencia o QR.
 * La suscripción se activa cuando el personal aprueba el pago.
 */
export async function createPlanManualPayment(planId: string, payload: PlanManualPaymentPayload): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

  if (!checkRateLimit(`payment-request:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 }).allowed) {
    return { success: false, error: 'Registraste demasiadas solicitudes. Intenta más tarde.' };
  }

  try {
    const result = await createPlanPaymentRequest(user, planId, payload);
    revalidatePath('/administrador/pagos/transacciones');
    revalidatePath('/staff/pagos');
    return {
      success: true,
      amount: result.amount,
      message: 'Recibimos tu solicitud. Activaremos tu plan cuando verifiquemos el pago.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof PaymentRequestError ? error.message : 'No pudimos registrar tu solicitud. Intenta nuevamente.',
    };
  }
}

/** Calcula el precio de un plan con un código de descuento (sin reservarlo) */
export async function previewPlanDiscount(planId: string, code: string): Promise<ActionResult & { total?: number; discount?: number; label?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Debes iniciar sesión para continuar.' };
  if (!checkRateLimit(`discount-preview:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).allowed) {
    return { success: false, error: 'Demasiados intentos. Espera unos minutos.' };
  }

  const plan = await prisma.plans.findUnique({ where: { id: String(planId ?? '') }, select: { price: true, is_active: true } });
  if (!plan?.is_active) return { success: false, error: 'El plan no está disponible.' };

  try {
    const result = await previewDiscount(user, { code, scope: 'plans', subtotal: plan.price });
    return { success: true, total: result.total, discount: result.discount, label: result.label };
  } catch (error) {
    return { success: false, error: error instanceof PaymentRequestError ? error.message : 'No pudimos validar el código.' };
  }
}
