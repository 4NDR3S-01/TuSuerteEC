'use server';

/** Administración de códigos de descuento y del programa de referidos */

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AuthorizationError, requirePermission } from '../auth/get-user';
import { recordAudit } from '../audit';
import { normalizeDiscountCode } from '../marketing/discounts';
import { saveReferralSettings, type ReferralSettings } from '../settings';

type ActionResult = { success: boolean; error?: string };

export type DiscountCodeInput = {
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  value: number;
  applies_to: 'all' | 'raffles' | 'plans';
  raffle_id: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof AuthorizationError) return { success: false, error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return { success: false, error: 'Ya existe un código con ese nombre.' };
  }
  if (error instanceof Error && error.name === 'InputError') return { success: false, error: error.message };
  console.error('[admin-marketing]', error);
  return { success: false, error: fallback };
}

function inputError(message: string) {
  const error = new Error(message);
  error.name = 'InputError';
  return error;
}

function parseDate(value: string | null, label: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw inputError(`${label} no es válida`);
  return date;
}

function discountData(input: DiscountCodeInput) {
  const code = normalizeDiscountCode(input.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw inputError('El código debe tener de 3 a 30 letras, números, guiones o guiones bajos.');
  if (code.startsWith('REF-')) throw inputError('El prefijo REF- está reservado para los códigos de referidos.');
  if (input.discount_type !== 'percent' && input.discount_type !== 'fixed') throw inputError('Tipo de descuento no válido');

  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) throw inputError('El valor del descuento debe ser mayor que cero');
  if (input.discount_type === 'percent' && value >= 100) throw inputError('El porcentaje debe ser menor que 100');

  if (!['all', 'raffles', 'plans'].includes(input.applies_to)) throw inputError('Alcance no válido');

  const maxUses = input.max_uses === null || input.max_uses === undefined || String(input.max_uses) === '' ? null : Number(input.max_uses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw inputError('El límite de usos debe ser un entero mayor que cero');
  const perUser = Number(input.max_uses_per_user ?? 1);
  if (!Number.isInteger(perUser) || perUser < 1) throw inputError('El límite por usuario debe ser un entero mayor que cero');

  const validFrom = parseDate(input.valid_from, 'La fecha de inicio');
  const validUntil = parseDate(input.valid_until, 'La fecha de fin');
  if (validFrom && validUntil && validFrom >= validUntil) throw inputError('La vigencia debe terminar después de comenzar');

  return {
    code,
    description: input.description ? String(input.description).trim().slice(0, 200) : null,
    discount_type: input.discount_type,
    value: Math.round(value * 100) / 100,
    applies_to: input.applies_to,
    raffle_id: input.applies_to === 'plans' ? null : input.raffle_id || null,
    max_uses: maxUses,
    max_uses_per_user: perUser,
    valid_from: validFrom,
    valid_until: validUntil,
    is_active: Boolean(input.is_active),
  };
}

export async function createDiscountCode(input: DiscountCodeInput): Promise<ActionResult> {
  try {
    const admin = await requirePermission('discounts.manage');
    const data = discountData(input);
    const created = await prisma.discount_codes.create({ data: { ...data, source: 'admin', created_by: admin.id } });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'discount.create', entityType: 'discount_code', entityId: created.id, data });
    revalidatePath('/administrador/marketing');
    return { success: true };
  } catch (error) {
    return fail(error, 'No se pudo crear el código.');
  }
}

export async function setDiscountCodeActive(codeId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const admin = await requirePermission('discounts.manage');
    await prisma.discount_codes.update({ where: { id: String(codeId) }, data: { is_active: Boolean(isActive) } });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: isActive ? 'discount.activate' : 'discount.deactivate', entityType: 'discount_code', entityId: codeId });
    revalidatePath('/administrador/marketing');
    return { success: true };
  } catch (error) {
    return fail(error, 'No se pudo actualizar el código.');
  }
}

/** Solo se eliminan códigos sin usos; los usados se desactivan para conservar el historial */
export async function deleteDiscountCode(codeId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission('discounts.manage');
    const uses = await prisma.discount_redemptions.count({ where: { code_id: String(codeId) } });
    if (uses > 0) return { success: false, error: 'Este código ya fue usado. Desactívalo en lugar de eliminarlo.' };
    await prisma.discount_codes.delete({ where: { id: codeId } });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'discount.delete', entityType: 'discount_code', entityId: codeId });
    revalidatePath('/administrador/marketing');
    return { success: true };
  } catch (error) {
    return fail(error, 'No se pudo eliminar el código.');
  }
}

export async function updateReferralSettings(input: ReferralSettings): Promise<ActionResult> {
  try {
    const admin = await requirePermission('settings.manage');
    const percent = Number(input.percent);
    const validityDays = Number(input.validityDays);
    if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return { success: false, error: 'El porcentaje debe estar entre 1 y 99.' };
    if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 730) return { success: false, error: 'La vigencia debe estar entre 1 y 730 días.' };

    const settings = { enabled: Boolean(input.enabled), percent: Math.round(percent * 100) / 100, validityDays };
    await saveReferralSettings(settings, admin.id);
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'settings.referral_update', entityType: 'settings', entityId: 'referral_program', data: settings });
    revalidatePath('/administrador/marketing');
    return { success: true };
  } catch (error) {
    return fail(error, 'No se pudo guardar la configuración.');
  }
}
