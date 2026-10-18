'use server';

/**
 * Acciones de administración (reemplazan las escrituras que antes se hacían
 * directamente desde el navegador contra Supabase). Todas verifican el rol en el servidor.
 */

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma, toPlain } from '../db';
import { AuthorizationError, requirePermission, type User } from '../auth/get-user';
import { isUserRole } from '../auth/roles';
import { recordAudit } from '../audit';
import { enrollActiveSubscribersInRaffle } from '../raffle/entries';
import { closeRaffle } from '../raffle/raffle-algorithm';
import { safeStoredFileUrl } from '../uploads';
import { getEcuadorianIdError } from '../validators/ecuador-id';
import { generateReferralCode } from '../marketing/referral-code';
import type { PaymentMethodConfig, PaymentMethodType } from '../payments/types';

// Forma plana (sin unión discriminada) porque el proyecto compila con `strict: false`
type ActionResult = { success: boolean; error?: string };

/** Error de validación con mensaje apto para mostrar al usuario */
class ValidationError extends Error {}

function toDate(value: string | null | undefined, label = 'La fecha') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${label} no es válida`);
  return date;
}

function optionalText(value: unknown, max: number, label: string) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text.length > max) throw new ValidationError(`${label} supera los ${max} caracteres`);
  return text || null;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2003') return 'No se puede eliminar porque tiene registros asociados.';
    if (error.code === 'P2025') return 'El registro no existe o ya fue eliminado.';
    if (error.code === 'P2002') return 'Ya existe un registro con ese valor.';
  }
  // Solo los errores propios se muestran tal cual; los demás pueden contener detalles internos
  if (error instanceof ValidationError || error instanceof AuthorizationError) return error.message;
  return fallback;
}

/** Ejecuta la acción con verificación de permiso y convierte los errores en `{ error }` */
async function guarded<T>(permission: Parameters<typeof requirePermission>[0], fallback: string, fn: (actor: User) => Promise<T>): Promise<MutationResult<T>> {
  let actor: User;
  try {
    actor = await requirePermission(permission);
  } catch (error) {
    return { error: errorMessage(error, 'No tienes permiso para realizar esta acción.') };
  }
  return runMutation(fallback, () => fn(actor));
}

function audit(actor: User, action: string, entityType: string, entityId: string | null, data?: Record<string, unknown>) {
  return recordAudit({ actorId: actor.id, actorRole: actor.role, action, entityType, entityId, data });
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

export type TeamMemberInput = {
  fullName: string;
  email: string;
  idNumber: string;
  phoneNumber: string;
  role: 'staff' | 'admin';
};

/** Contraseña temporal legible (sin caracteres ambiguos) con letras, números y un símbolo */
function temporaryPassword() {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  let value = '';
  for (let i = 0; i < 8; i += 1) value += letters[randomInt(letters.length)];
  for (let i = 0; i < 3; i += 1) value += digits[randomInt(digits.length)];
  return `${value}-${digits[randomInt(digits.length)]}`;
}

/**
 * Crea una cuenta del equipo (staff o admin). Se genera una contraseña temporal que se muestra
 * una sola vez al administrador; la persona debe cambiarla en su primer ingreso.
 */
export async function createTeamMember(input: TeamMemberInput): Promise<MutationResult<{ email: string; temporaryPassword: string }>> {
  const result = await guarded('users.manage', 'No se pudo crear la cuenta.', async (admin) => {
    const fullName = optionalText(input.fullName, 120, 'El nombre');
    if (!fullName || fullName.split(/\s+/).length < 2) throw new ValidationError('Escribe nombre y apellido.');
    const email = String(input.email ?? '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('El correo no es válido.');
    const idNumber = String(input.idNumber ?? '').trim();
    const idError = getEcuadorianIdError(idNumber);
    if (idError) throw new ValidationError(idError);
    const phoneNumber = String(input.phoneNumber ?? '').trim();
    if (!/^\+?[0-9\s-]{7,20}$/.test(phoneNumber)) throw new ValidationError('Ingresa un teléfono válido.');
    if (input.role !== 'staff' && input.role !== 'admin') throw new ValidationError('Rol no válido.');

    if (await prisma.users.count({ where: { email } })) throw new ValidationError('Ya existe una cuenta con ese correo. Cámbiale el rol desde la lista.');
    if (await prisma.profiles.count({ where: { id_number: idNumber } })) throw new ValidationError('Ya existe una cuenta con esa cédula. Cámbiale el rol desde la lista.');

    const password = temporaryPassword();
    const created = await prisma.users.create({
      data: {
        email,
        password_hash: await bcrypt.hash(password, 10),
        email_verified_at: new Date(),
        must_change_password: true,
        profile: {
          create: {
            full_name: fullName,
            id_number: idNumber,
            phone_number: phoneNumber,
            email,
            address: '',
            role: input.role,
            referral_code: generateReferralCode(),
          },
        },
      },
    });
    await audit(admin, 'user.create_team_member', 'user', created.id, { email, role: input.role });
    return { email, temporaryPassword: password };
  });
  revalidatePath('/administrador/usuarios');
  return result;
}

async function ensureAnotherAdmin(excludingUserId: string) {
  const admins = await prisma.profiles.count({
    where: { role: 'admin', id: { not: excludingUserId }, user: { suspended_at: null } },
  });
  if (admins === 0) throw new ValidationError('Debe quedar al menos un administrador activo.');
}

export async function updateUserRole(userId: string, role: string): Promise<ActionResult> {
  const result = await guarded('users.manage', 'No se pudo actualizar el rol.', async (admin) => {
    if (!isUserRole(role)) throw new ValidationError('Rol no válido');
    if (userId === admin.id) throw new ValidationError('No puedes cambiar tu propio rol.');

    const target = await prisma.profiles.findUniqueOrThrow({ where: { id: String(userId) }, select: { role: true } });
    if (target.role === role) return;
    if (target.role === 'admin') await ensureAnotherAdmin(userId);

    // Cambiar la versión de sesión obliga a iniciar sesión otra vez con el nuevo rol
    await prisma.$transaction([
      prisma.profiles.update({ where: { id: userId }, data: { role } }),
      prisma.users.update({ where: { id: userId }, data: { session_version: { increment: 1 } } }),
    ]);
    await audit(admin, 'user.role_change', 'user', userId, { from: target.role, to: role });
  });
  revalidatePath('/administrador/usuarios');
  return result.error ? { success: false, error: result.error } : { success: true };
}

/** Suspende una cuenta: no puede iniciar sesión y sus sesiones abiertas se cierran */
export async function suspendUser(userId: string, reason: string): Promise<ActionResult> {
  const result = await guarded('users.manage', 'No se pudo suspender la cuenta.', async (admin) => {
    if (userId === admin.id) throw new ValidationError('No puedes suspender tu propia cuenta.');
    const cleanReason = optionalText(reason, 300, 'El motivo');
    if (!cleanReason) throw new ValidationError('Indica el motivo de la suspensión.');

    const target = await prisma.profiles.findUniqueOrThrow({ where: { id: String(userId) }, select: { role: true } });
    if (target.role === 'admin') await ensureAnotherAdmin(userId);

    await prisma.users.update({
      where: { id: userId },
      data: { suspended_at: new Date(), suspension_reason: cleanReason, session_version: { increment: 1 } },
    });
    await audit(admin, 'user.suspend', 'user', userId, { reason: cleanReason });
  });
  revalidatePath('/administrador/usuarios');
  return result.error ? { success: false, error: result.error } : { success: true };
}

export async function reactivateUser(userId: string): Promise<ActionResult> {
  const result = await guarded('users.manage', 'No se pudo reactivar la cuenta.', async (admin) => {
    await prisma.users.update({ where: { id: String(userId) }, data: { suspended_at: null, suspension_reason: null } });
    await audit(admin, 'user.reactivate', 'user', userId);
  });
  revalidatePath('/administrador/usuarios');
  return result.error ? { success: false, error: result.error } : { success: true };
}

/**
 * Elimina una cuenta solo si no tiene historial (pagos, boletos o premios).
 * Las cuentas con historial se suspenden para conservar la trazabilidad.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const result = await guarded('users.manage', 'No se pudo eliminar el usuario.', async (admin) => {
    if (userId === admin.id) throw new ValidationError('No puedes eliminar tu propia cuenta.');

    const [payments, entries, wins, profile] = await Promise.all([
      prisma.payment_transactions.count({ where: { user_id: String(userId) } }),
      prisma.raffle_entries.count({ where: { user_id: userId } }),
      prisma.winners.count({ where: { user_id: userId } }),
      prisma.profiles.findUniqueOrThrow({ where: { id: userId }, select: { role: true, email: true } }),
    ]);
    if (payments + entries + wins > 0) {
      throw new ValidationError('Esta cuenta tiene pagos, boletos o premios registrados. Suspéndela en lugar de eliminarla.');
    }
    if (profile.role === 'admin') await ensureAnotherAdmin(userId);

    await prisma.users.delete({ where: { id: userId } });
    await audit(admin, 'user.delete', 'user', userId, { email: profile.email });
  });
  revalidatePath('/administrador/usuarios');
  return result.error ? { success: false, error: result.error } : { success: true };
}

/** Resultado con la misma forma que devolvía Supabase (`{ error }`), para minimizar cambios en la UI */
type MutationResult<T = void> = { error: string | null; data?: T };

async function runMutation<T>(fallback: string, fn: () => Promise<T>): Promise<MutationResult<T>> {
  try {
    const data = await fn();
    return { error: null, data };
  } catch (error) {
    console.error(`[admin] ${fallback}:`, error);
    return { error: errorMessage(error, fallback) };
  }
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

export type PlanInput = {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  benefits: string[] | null;
  max_concurrent_raffles: number | null;
  show_raffles_limit?: boolean;
  raffles_limit_message?: string | null;
  is_active: boolean;
};

function planData(input: PlanInput) {
  const name = optionalText(input.name, 80, 'El nombre');
  if (!name) throw new ValidationError('El nombre del plan es requerido');
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100_000) throw new ValidationError('El precio no es válido');
  const maxConcurrent = input.max_concurrent_raffles === null || input.max_concurrent_raffles === undefined ? null : Number(input.max_concurrent_raffles);
  if (maxConcurrent !== null && (!Number.isInteger(maxConcurrent) || maxConcurrent < 1)) {
    throw new ValidationError('El límite de sorteos simultáneos debe ser un número entero mayor que cero');
  }
  const benefits = Array.isArray(input.benefits)
    ? input.benefits.map((benefit) => String(benefit).trim()).filter(Boolean).slice(0, 20)
    : null;

  return {
    name,
    description: optionalText(input.description, 500, 'La descripción'),
    price: Math.round(price * 100) / 100,
    currency: /^[A-Z]{3}$/.test(String(input.currency ?? '').toUpperCase()) ? String(input.currency).toUpperCase() : 'USD',
    interval: input.interval === 'year' ? 'year' : 'month',
    benefits: benefits ?? Prisma.DbNull,
    max_concurrent_raffles: maxConcurrent,
    show_raffles_limit: Boolean(input.show_raffles_limit),
    raffles_limit_message: optionalText(input.raffles_limit_message, 200, 'El mensaje'),
    is_active: Boolean(input.is_active),
  };
}

function revalidatePlans() {
  revalidatePath('/administrador/planes');
  revalidatePath('/app/planes');
  revalidatePath('/');
}

export async function createPlan(input: PlanInput): Promise<MutationResult> {
  const result = await guarded('plans.manage', 'Error al crear el plan', async (actor) => {
    const plan = await prisma.plans.create({ data: planData(input) });
    await audit(actor, 'plan.create', 'plan', plan.id, { name: plan.name, price: plan.price });
  });
  revalidatePlans();
  return result;
}

export async function updatePlan(planId: string, input: PlanInput): Promise<MutationResult> {
  const result = await guarded('plans.manage', 'Error al actualizar el plan', async (actor) => {
    const before = await prisma.plans.findUniqueOrThrow({ where: { id: String(planId) } });
    const data = planData(input);
    await prisma.plans.update({ where: { id: planId }, data });
    // El precio de las suscripciones vigentes no cambia: se aplica en la próxima compra
    await audit(actor, 'plan.update', 'plan', planId, { price_before: before.price, price_after: data.price });
  });
  revalidatePlans();
  return result;
}

export async function setPlanActive(planId: string, isActive: boolean): Promise<MutationResult> {
  const result = await guarded('plans.manage', 'Error al cambiar el estado del plan', async (actor) => {
    await prisma.plans.update({ where: { id: String(planId) }, data: { is_active: Boolean(isActive) } });
    await audit(actor, isActive ? 'plan.activate' : 'plan.deactivate', 'plan', planId);
  });
  revalidatePlans();
  return result;
}

/** Solo un plan puede estar destacado a la vez */
export async function setPlanFeatured(planId: string, isFeatured: boolean): Promise<MutationResult> {
  const result = await guarded('plans.manage', 'Error al cambiar el estado de destacado', async () => {
    await prisma.$transaction([
      ...(isFeatured ? [prisma.plans.updateMany({ where: { id: { not: String(planId) } }, data: { is_featured: false } })] : []),
      prisma.plans.update({ where: { id: String(planId) }, data: { is_featured: Boolean(isFeatured) } }),
    ]);
  });
  revalidatePlans();
  return result;
}

export async function duplicatePlan(planId: string): Promise<MutationResult> {
  const result = await guarded('plans.manage', 'Error al duplicar el plan', async (actor) => {
    const plan = await prisma.plans.findUniqueOrThrow({ where: { id: String(planId) } });
    const copy = await prisma.plans.create({
      data: {
        name: `${plan.name} (Copia)`,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        benefits: plan.benefits ?? Prisma.DbNull,
        max_concurrent_raffles: plan.max_concurrent_raffles,
        show_raffles_limit: plan.show_raffles_limit,
        raffles_limit_message: plan.raffles_limit_message,
        is_active: false, // Por defecto inactivo
      },
    });
    await audit(actor, 'plan.duplicate', 'plan', copy.id, { source: planId });
  });
  revalidatePlans();
  return result;
}

export async function deletePlan(planId: string): Promise<MutationResult> {
  const result = await guarded('plans.manage', 'Error al eliminar el plan', async (actor) => {
    const [subscriptions, pendingPayments] = await Promise.all([
      prisma.subscriptions.count({ where: { plan_id: String(planId) } }),
      prisma.payment_transactions.count({ where: { transaction_type: 'subscription', status: 'pending', metadata: { path: ['plan_id'], equals: planId } } }),
    ]);
    if (subscriptions > 0 || pendingPayments > 0) {
      throw new ValidationError('Este plan tiene suscripciones o pagos registrados. Desactívalo en lugar de eliminarlo.');
    }
    await prisma.plans.delete({ where: { id: planId } });
    await audit(actor, 'plan.delete', 'plan', planId);
  });
  revalidatePlans();
  return result;
}

// ---------------------------------------------------------------------------
// Ganadores (seguimiento de premios: staff y admin)
// ---------------------------------------------------------------------------

function revalidateWinners() {
  revalidatePath('/administrador/ganadores');
  revalidatePath('/staff/ganadores');
  revalidatePath('/');
}

export async function markWinnerContacted(winnerId: string, notes: string | null): Promise<MutationResult> {
  const result = await guarded('winners.manage', 'No se pudo actualizar el estado', async (actor) => {
    const cleanNotes = optionalText(notes, 1000, 'Las notas');
    const winner = await prisma.winners.findUniqueOrThrow({ where: { id: String(winnerId) }, select: { status: true } });
    if (winner.status === 'prize_delivered') throw new ValidationError('Este premio ya fue entregado.');
    await prisma.winners.update({
      where: { id: winnerId },
      data: {
        status: 'contacted',
        contacted_at: new Date(),
        contact_attempts: { increment: 1 },
        ...(cleanNotes ? { notes: cleanNotes } : {}),
      },
    });
    await audit(actor, 'winner.contacted', 'winner', winnerId);
  });
  revalidateWinners();
  return result;
}

export async function markWinnerDelivered(winnerId: string, notes: string | null, deliveryPhotoUrl: string | null): Promise<MutationResult> {
  const result = await guarded('winners.manage', 'No se pudo actualizar el estado', async (actor) => {
    const cleanNotes = optionalText(notes, 1000, 'Las notas');
    const photo = deliveryPhotoUrl ? safeStoredFileUrl(deliveryPhotoUrl, 'winners-photos') : null;
    if (deliveryPhotoUrl && !photo) throw new ValidationError('La foto de entrega no es válida.');
    await prisma.winners.update({
      where: { id: String(winnerId) },
      data: {
        status: 'prize_delivered',
        delivered_at: new Date(),
        delivery_photo_url: photo,
        ...(cleanNotes ? { notes: cleanNotes } : {}),
      },
    });
    await audit(actor, 'winner.delivered', 'winner', winnerId, { photo });
  });
  revalidateWinners();
  return result;
}

export async function setWinnerTestimonial(winnerId: string, testimonial: string): Promise<MutationResult> {
  const result = await guarded('winners.manage', 'No se pudo agregar el testimonio', async (actor) => {
    const text = optionalText(testimonial, 600, 'El testimonio');
    await prisma.winners.update({ where: { id: String(winnerId) }, data: { testimonial: text } });
    await audit(actor, 'winner.testimonial', 'winner', winnerId);
  });
  revalidateWinners();
  return result;
}

// ---------------------------------------------------------------------------
// Sorteos
// ---------------------------------------------------------------------------

const ENTRY_MODES = ['subscribers_only', 'tickets_only', 'hybrid'];
const PRIZE_CATEGORIES = ['electronics', 'vehicles', 'travel', 'cash', 'home', 'entertainment', 'sports', 'other'];

/**
 * Transiciones permitidas. "drawn" solo se alcanza ejecutando el sorteo y "closed" solo
 * mediante el cierre (que fija la lista de boletos y publica el compromiso de la semilla).
 */
const RAFFLE_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['closed', 'draft'],
  closed: [],
  drawn: ['completed'],
  completed: [],
};

export type RaffleInput = {
  title: string;
  description: string | null;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  draw_date: string | null;
  entry_mode: string;
  total_winners: number;
  max_entries_per_user: number | null;
  is_trending?: boolean;
  ticket_price?: number | null;
  terms?: string | null;
  status?: string;
};

function raffleData(input: RaffleInput) {
  const title = optionalText(input.title, 120, 'El título');
  if (!title) throw new ValidationError('El título es requerido');
  const prizeDescription = optionalText(input.prize_description, 500, 'La descripción del premio');
  if (!prizeDescription) throw new ValidationError('La descripción del premio es requerida');
  if (!ENTRY_MODES.includes(input.entry_mode)) throw new ValidationError('Modalidad de participación no válida');

  const totalWinners = Number(input.total_winners);
  if (!Number.isInteger(totalWinners) || totalWinners < 1 || totalWinners > 1000) {
    throw new ValidationError('La cantidad de ganadores debe ser un número entero entre 1 y 1000');
  }

  const maxEntries = input.max_entries_per_user ? Number(input.max_entries_per_user) : null;
  if (maxEntries !== null && (!Number.isInteger(maxEntries) || maxEntries < 1)) {
    throw new ValidationError('El máximo de participaciones por usuario debe ser un entero mayor que cero');
  }

  const rawPrice = input.ticket_price;
  const ticketPrice = rawPrice === null || rawPrice === undefined || String(rawPrice) === '' ? null : Number(rawPrice);
  if (ticketPrice !== null && (!Number.isFinite(ticketPrice) || ticketPrice <= 0 || ticketPrice > 10_000)) {
    throw new ValidationError('El precio del boleto no es válido');
  }
  if (input.entry_mode !== 'subscribers_only' && !ticketPrice) {
    throw new ValidationError('Los sorteos con venta de boletos necesitan un precio por boleto');
  }

  const startDate = toDate(input.start_date, 'La fecha de inicio');
  const endDate = toDate(input.end_date, 'La fecha de cierre');
  const drawDate = toDate(input.draw_date, 'La fecha del sorteo');
  if (!endDate || !drawDate) throw new ValidationError('Indica la fecha de cierre y la fecha del sorteo');
  if (startDate && startDate >= endDate) throw new ValidationError('La fecha de inicio debe ser anterior al cierre');
  if (endDate > drawDate) throw new ValidationError('El sorteo debe realizarse después del cierre de participaciones');

  const imageUrl = input.image_url ? safeStoredFileUrl(input.image_url, 'raffle-prizes') : null;
  if (input.image_url && !imageUrl) throw new ValidationError('La imagen del premio no es válida');

  return {
    title,
    description: optionalText(input.description, 3000, 'La descripción'),
    prize_description: prizeDescription,
    prize_category: PRIZE_CATEGORIES.includes(String(input.prize_category)) ? String(input.prize_category) : 'other',
    image_url: imageUrl,
    start_date: startDate,
    end_date: endDate,
    draw_date: drawDate,
    entry_mode: input.entry_mode,
    total_winners: totalWinners,
    max_entries_per_user: maxEntries,
    is_trending: Boolean(input.is_trending),
    ticket_price: input.entry_mode === 'subscribers_only' ? null : Math.round(ticketPrice! * 100) / 100,
    terms: optionalText(input.terms, 5000, 'Las condiciones'),
  };
}

type RaffleData = ReturnType<typeof raffleData>;

/** Los formularios envían fechas con precisión de minutos: se comparan a esa resolución */
function minuteOf(date: Date | null | undefined) {
  return date ? Math.floor(date.getTime() / 60_000) : null;
}

/**
 * Con participaciones o pagos registrados, las condiciones que el participante aceptó no pueden
 * empeorar: no se cambia la modalidad, el precio ni el premio, no se reducen ganadores ni límites
 * y las fechas solo pueden postergarse.
 */
function assertSafeRaffleChange(before: Prisma.rafflesGetPayload<object>, after: RaffleData, hasParticipants: boolean) {
  if (before.status === 'drawn' || before.status === 'completed') {
    const changed = (['entry_mode', 'ticket_price', 'total_winners', 'prize_description', 'max_entries_per_user'] as const)
      .some((field) => before[field] !== after[field]);
    if (changed || minuteOf(before.end_date) !== minuteOf(after.end_date) || minuteOf(before.draw_date) !== minuteOf(after.draw_date)) {
      throw new ValidationError('El sorteo ya se ejecutó: solo puedes editar textos e imagen.');
    }
    return;
  }

  if (!hasParticipants && before.status !== 'closed') return;

  if (before.entry_mode !== after.entry_mode) throw new ValidationError('No puedes cambiar la modalidad: ya hay participaciones.');
  if (before.ticket_price !== after.ticket_price) throw new ValidationError('No puedes cambiar el precio del boleto: ya hay participaciones o pagos.');
  if (before.prize_description !== after.prize_description || before.prize_category !== after.prize_category) {
    throw new ValidationError('No puedes cambiar el premio: ya hay participaciones o pagos.');
  }
  if (after.total_winners < before.total_winners || (before.status === 'closed' && after.total_winners !== before.total_winners)) {
    throw new ValidationError('No puedes reducir la cantidad de ganadores (ni cambiarla tras el cierre).');
  }
  if (before.max_entries_per_user === null && after.max_entries_per_user !== null) {
    throw new ValidationError('No puedes imponer un límite de participaciones cuando ya hay participaciones.');
  }
  if (before.max_entries_per_user && after.max_entries_per_user && after.max_entries_per_user < before.max_entries_per_user) {
    throw new ValidationError('No puedes reducir el límite de participaciones por usuario.');
  }
  if (minuteOf(before.start_date) !== minuteOf(after.start_date)) throw new ValidationError('No puedes cambiar la fecha de inicio.');
  if (minuteOf(after.end_date)! < minuteOf(before.end_date)!) throw new ValidationError('La fecha de cierre solo puede postergarse.');
  if (minuteOf(after.draw_date)! < minuteOf(before.draw_date)!) throw new ValidationError('La fecha del sorteo solo puede postergarse.');
  if (before.status === 'closed' && minuteOf(before.end_date) !== minuteOf(after.end_date)) {
    throw new ValidationError('El sorteo está cerrado: no puedes cambiar la fecha de cierre.');
  }
}

function revalidateRaffles(raffleId?: string) {
  revalidatePath('/administrador/sorteos');
  revalidatePath('/app/sorteos');
  revalidatePath('/sorteos');
  revalidatePath('/app');
  revalidatePath('/');
  if (raffleId) {
    revalidatePath(`/app/sorteos/${raffleId}`);
    revalidatePath(`/sorteos/${raffleId}`);
    revalidatePath(`/resultados/${raffleId}`);
  }
}

async function raffleHasParticipants(raffleId: string) {
  const [entries, payments] = await Promise.all([
    prisma.raffle_entries.count({ where: { raffle_id: raffleId } }),
    prisma.payment_transactions.count({ where: { raffle_id: raffleId, status: { in: ['pending', 'approved', 'completed'] } } }),
  ]);
  return entries + payments > 0;
}

export async function createRaffle(input: RaffleInput): Promise<MutationResult> {
  const result = await guarded('raffles.manage', 'Error al crear el sorteo', async (actor) => {
    const status = input.status === 'active' ? 'active' : 'draft';
    const raffle = await prisma.raffles.create({ data: { ...raffleData(input), status } });
    await audit(actor, 'raffle.create', 'raffle', raffle.id, { title: raffle.title, status });
    if (status === 'active') await enrollActiveSubscribersInRaffle(raffle.id);
  });
  revalidateRaffles();
  return result;
}

export async function updateRaffle(raffleId: string, input: RaffleInput): Promise<MutationResult> {
  const result = await guarded('raffles.manage', 'Error al actualizar el sorteo', async (actor) => {
    const before = await prisma.raffles.findUniqueOrThrow({ where: { id: String(raffleId) } });
    const data = raffleData(input);
    assertSafeRaffleChange(before, data, await raffleHasParticipants(raffleId));

    const raffle = await prisma.raffles.update({ where: { id: raffleId }, data });
    const changes = Object.fromEntries(
      (Object.keys(data) as Array<keyof RaffleData>)
        .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(data[key]))
        .map((key) => [key, { from: before[key], to: data[key] }]),
    );
    await audit(actor, 'raffle.update', 'raffle', raffleId, { changes });
    // Si el sorteo activo pasa a aceptar suscriptores, inscribirlos
    if (raffle.status === 'active') await enrollActiveSubscribersInRaffle(raffle.id);
  });
  revalidateRaffles(raffleId);
  return result;
}

export async function setRaffleStatus(raffleId: string, status: string): Promise<MutationResult> {
  const result = await guarded('raffles.manage', 'Error al cambiar el estado', async (actor) => {
    const raffle = await prisma.raffles.findUniqueOrThrow({ where: { id: String(raffleId) } });
    if (!(RAFFLE_TRANSITIONS[raffle.status] ?? []).includes(status)) {
      throw new ValidationError(
        status === 'drawn'
          ? 'Para obtener ganadores, ejecuta el sorteo desde la pantalla de ejecución.'
          : `No se puede pasar de "${raffle.status}" a "${status}".`,
      );
    }

    if (status === 'closed') {
      await closeRaffle(raffleId, actor);
      return;
    }

    if (status === 'active') {
      if (!raffle.end_date || raffle.end_date <= new Date()) {
        throw new ValidationError('La fecha de cierre ya pasó. Actualízala antes de activar el sorteo.');
      }
      if (raffle.entry_mode !== 'subscribers_only' && !raffle.ticket_price) {
        throw new ValidationError('Configura el precio del boleto antes de activar el sorteo.');
      }
    }

    if (status === 'draft' && (await raffleHasParticipants(raffleId))) {
      throw new ValidationError('No puedes volver a borrador un sorteo con participaciones o pagos.');
    }

    // La actualización condicional evita carreras entre dos administradores
    const updated = await prisma.raffles.updateMany({ where: { id: raffleId, status: raffle.status }, data: { status } });
    if (updated.count === 0) throw new ValidationError('El sorteo cambió mientras tanto. Recarga la página.');
    await audit(actor, 'raffle.status_change', 'raffle', raffleId, { from: raffle.status, to: status });

    // Al activar un sorteo, los suscriptores activos participan automáticamente
    if (status === 'active') await enrollActiveSubscribersInRaffle(raffleId);
  });
  revalidateRaffles(raffleId);
  return result;
}

export async function deleteRaffle(raffleId: string): Promise<MutationResult> {
  const result = await guarded('raffles.manage', 'Error al eliminar el sorteo', async (actor) => {
    const raffle = await prisma.raffles.findUniqueOrThrow({ where: { id: String(raffleId) }, select: { status: true, title: true } });
    if (raffle.status !== 'draft' || (await raffleHasParticipants(raffleId))) {
      throw new ValidationError('Solo puedes eliminar sorteos en borrador y sin participaciones ni pagos.');
    }
    await prisma.raffles.delete({ where: { id: raffleId } });
    await audit(actor, 'raffle.delete', 'raffle', raffleId, { title: raffle.title });
  });
  revalidateRaffles();
  return result;
}

// ---------------------------------------------------------------------------
// Eventos en vivo (staff y admin)
// ---------------------------------------------------------------------------

const EVENT_STATUSES = ['scheduled', 'live', 'completed', 'canceled'];

export type LiveEventInput = {
  title: string;
  description: string | null;
  start_at: string;
  countdown_start_at: string | null;
  stream_url: string | null;
  raffle_id: string | null;
  is_visible: boolean;
};

function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    return url.toString();
  } catch {
    throw new ValidationError('El enlace de la transmisión debe ser una URL http(s) válida');
  }
}

function liveEventData(input: LiveEventInput) {
  const title = optionalText(input.title, 120, 'El título');
  if (!title) throw new ValidationError('El título es requerido');
  const startAt = toDate(input.start_at, 'La fecha de inicio');
  if (!startAt) throw new ValidationError('La fecha de inicio no es válida');
  const countdownStart = toDate(input.countdown_start_at, 'El inicio de la cuenta regresiva');
  if (countdownStart && countdownStart > startAt) throw new ValidationError('La cuenta regresiva debe empezar antes del evento');

  return {
    title,
    description: optionalText(input.description, 1000, 'La descripción'),
    start_at: startAt,
    countdown_start_at: countdownStart,
    stream_url: safeHttpUrl(input.stream_url),
    raffle_id: input.raffle_id || null,
    is_visible: Boolean(input.is_visible),
  };
}

function revalidateLiveEvents() {
  revalidatePath('/administrador/eventos-vivo');
  revalidatePath('/staff/eventos-vivo');
  revalidatePath('/', 'layout');
}

export async function createLiveEvent(input: LiveEventInput): Promise<MutationResult> {
  const result = await guarded('live_events.manage', 'Error al crear el evento', async (actor) => {
    const event = await prisma.live_events.create({ data: { ...liveEventData(input), status: 'scheduled' } });
    await audit(actor, 'live_event.create', 'live_event', event.id, { title: event.title });
  });
  revalidateLiveEvents();
  return result;
}

export async function updateLiveEvent(eventId: string, input: LiveEventInput): Promise<MutationResult> {
  const result = await guarded('live_events.manage', 'Error al actualizar el evento', async (actor) => {
    await prisma.live_events.update({ where: { id: String(eventId) }, data: liveEventData(input) });
    await audit(actor, 'live_event.update', 'live_event', eventId);
  });
  revalidateLiveEvents();
  return result;
}

export async function setLiveEventStatus(eventId: string, status: string): Promise<MutationResult> {
  const result = await guarded('live_events.manage', 'Error al cambiar el estado', async (actor) => {
    if (!EVENT_STATUSES.includes(status)) throw new ValidationError('Estado no válido');
    await prisma.live_events.update({ where: { id: String(eventId) }, data: { status } });
    await audit(actor, 'live_event.status_change', 'live_event', eventId, { status });
  });
  revalidateLiveEvents();
  return result;
}

/** Cambia la visibilidad; al ocultar un evento también se desactiva su alerta */
export async function setLiveEventVisibility(eventId: string, isVisible: boolean): Promise<MutationResult> {
  const result = await guarded('live_events.manage', 'Error al cambiar la visibilidad', async (actor) => {
    await prisma.live_events.update({
      where: { id: String(eventId) },
      data: { is_visible: Boolean(isVisible), ...(isVisible ? {} : { show_as_alert: false }) },
    });
    await audit(actor, 'live_event.visibility', 'live_event', eventId, { is_visible: Boolean(isVisible) });
  });
  revalidateLiveEvents();
  return result;
}

/** Solo un evento puede mostrarse como alerta a la vez */
export async function setLiveEventAlert(eventId: string, showAsAlert: boolean): Promise<MutationResult> {
  const result = await guarded('live_events.manage', 'Error al cambiar el estado de alerta', async () => {
    if (showAsAlert) {
      const event = await prisma.live_events.findUniqueOrThrow({ where: { id: String(eventId) }, select: { is_visible: true, status: true } });
      if (!event.is_visible) throw new ValidationError('Haz visible el evento antes de mostrarlo como aviso.');
      if (event.status === 'completed' || event.status === 'canceled') throw new ValidationError('No se puede avisar de un evento finalizado o cancelado.');
    }
    await prisma.$transaction([
      prisma.live_events.updateMany({ where: { id: { not: String(eventId) } }, data: { show_as_alert: false } }),
      prisma.live_events.update({ where: { id: String(eventId) }, data: { show_as_alert: Boolean(showAsAlert) } }),
    ]);
  });
  revalidateLiveEvents();
  return result;
}

export async function deleteLiveEvent(eventId: string): Promise<MutationResult> {
  const result = await guarded('live_events.manage', 'Error al eliminar el evento', async (actor) => {
    await prisma.live_events.delete({ where: { id: String(eventId) } });
    await audit(actor, 'live_event.delete', 'live_event', eventId);
  });
  revalidateLiveEvents();
  return result;
}

// ---------------------------------------------------------------------------
// Métodos de pago
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_TYPES: PaymentMethodType[] = ['manual_transfer', 'qr_code'];

export type PaymentMethodInput = {
  name: string;
  description: string | null;
  icon: string | null;
  type: PaymentMethodType;
  is_active: boolean;
  instructions: string | null;
  config: PaymentMethodConfig;
};

/** Solo se guardan los campos conocidos de la configuración (nada arbitrario desde el cliente) */
function sanitizePaymentConfig(type: PaymentMethodType, config: PaymentMethodConfig | null | undefined): PaymentMethodConfig {
  const scopes = (Array.isArray(config?.scopes) ? config.scopes : []).filter((scope) => scope === 'raffles' || scope === 'plans');
  const text = (value: unknown, max = 200) => optionalText(value, max, 'Un campo del método de pago') ?? undefined;
  const base: PaymentMethodConfig = { scopes: Array.from(new Set(scopes)), currency: 'USD' };

  if (type === 'manual_transfer') {
    const manual = config?.manual ?? {};
    return {
      ...base,
      manual: {
        bankName: text(manual.bankName),
        accountNumber: text(manual.accountNumber, 40),
        accountType: text(manual.accountType, 40),
        beneficiary: text(manual.beneficiary),
        identification: text(manual.identification, 20),
        instructions: text(manual.instructions, 1000),
        requiresProof: manual.requiresProof !== false,
      },
    };
  }

  const qr = config?.qr ?? {};
  const qrImageUrl = qr.qrImageUrl ? safeStoredFileUrl(qr.qrImageUrl, 'payment-qr-codes') : null;
  if (qr.qrImageUrl && !qrImageUrl) throw new ValidationError('La imagen del código QR no es válida');
  return {
    ...base,
    qr: {
      provider: text(qr.provider, 60),
      qrImageUrl: qrImageUrl ?? undefined,
      accountId: text(qr.accountId, 80),
      accountName: text(qr.accountName),
      instructions: text(qr.instructions, 1000),
      requiresProof: qr.requiresProof !== false,
    },
  };
}

function paymentMethodData(input: PaymentMethodInput) {
  const name = optionalText(input.name, 80, 'El nombre');
  if (!name) throw new ValidationError('El nombre es requerido');
  if (!PAYMENT_METHOD_TYPES.includes(input.type)) throw new ValidationError('Tipo de método de pago no válido');

  return {
    name,
    description: optionalText(input.description, 300, 'La descripción'),
    // Los iconos ahora son de la biblioteca de la interfaz; se ignora el emoji antiguo
    icon: null,
    type: input.type,
    is_active: Boolean(input.is_active),
    instructions: optionalText(input.instructions, 1000, 'Las instrucciones'),
    config: sanitizePaymentConfig(input.type, input.config) as Prisma.InputJsonValue,
  };
}

function revalidatePaymentMethods() {
  revalidatePath('/administrador/pagos/metodos');
  revalidatePath('/app/planes');
}

export async function createPaymentMethod(input: PaymentMethodInput) {
  const result = await guarded('payment_methods.manage', 'No se pudo guardar el método de pago.', async (actor) => {
    const method = await prisma.payment_methods.create({ data: paymentMethodData(input) });
    await audit(actor, 'payment_method.create', 'payment_method', method.id, { name: method.name });
    return toPlain(method);
  });
  revalidatePaymentMethods();
  return result;
}

export async function updatePaymentMethod(methodId: string, input: PaymentMethodInput) {
  const result = await guarded('payment_methods.manage', 'No se pudo guardar el método de pago.', async (actor) => {
    const data = paymentMethodData(input);
    const method = await prisma.payment_methods.update({ where: { id: String(methodId) }, data });
    // Cambiar los datos de la cuenta bancaria es una operación sensible: se audita completa
    await audit(actor, 'payment_method.update', 'payment_method', methodId, { config: data.config as Record<string, unknown> });
    return toPlain(method);
  });
  revalidatePaymentMethods();
  return result;
}

export async function setPaymentMethodActive(methodId: string, isActive: boolean): Promise<MutationResult> {
  const result = await guarded('payment_methods.manage', 'No se pudo actualizar el estado del método.', async (actor) => {
    await prisma.payment_methods.update({ where: { id: String(methodId) }, data: { is_active: Boolean(isActive) } });
    await audit(actor, isActive ? 'payment_method.activate' : 'payment_method.deactivate', 'payment_method', methodId);
  });
  revalidatePaymentMethods();
  return result;
}

export async function deletePaymentMethod(methodId: string): Promise<MutationResult> {
  const result = await guarded('payment_methods.manage', 'No se pudo eliminar el método.', async (actor) => {
    const transactions = await prisma.payment_transactions.count({ where: { payment_method_id: String(methodId) } });
    if (transactions > 0) {
      throw new ValidationError('Este método tiene pagos registrados. Desactívalo en lugar de eliminarlo.');
    }
    await prisma.payment_methods.delete({ where: { id: methodId } });
    await audit(actor, 'payment_method.delete', 'payment_method', methodId);
  });
  revalidatePaymentMethods();
  return result;
}
