'use server';

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { auth } from '../../auth';
import { getEcuadorianIdError } from '../validators/ecuador-id';
import { getBaseUrl } from '../utils/get-base-url';
import { checkRateLimit } from '../security/rate-limit';
import { getClientIp } from '../security/request';
import { recordAudit } from '../audit';
import { generateReferralCode } from '../marketing/referral-code';
import { sendMail } from '../mail';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora
const BCRYPT_ROUNDS = 10;
const PASSWORD_MAX_LENGTH = 128;

// Límites anti-abuso por IP
const LOOKUP_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };
const REGISTER_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };
const RESET_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

async function allowFromIp(prefix: string, rule: { limit: number; windowMs: number }) {
  return checkRateLimit(`${prefix}:${await getClientIp()}`, rule).allowed;
}

function passwordError(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (password.length > PASSWORD_MAX_LENGTH) return 'La contraseña es demasiado larga.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe incluir letras y números.';
  return null;
}

// Forma plana (sin unión discriminada) porque el proyecto compila con `strict: false`
type ActionResult = { success: boolean; error?: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const normalized = normalizeEmail(String(email ?? ''));
  if (!normalized) return false;
  // Sin límite, este endpoint permitiría enumerar cuentas registradas
  if (!(await allowFromIp('lookup', LOOKUP_LIMIT))) return false;
  const count = await prisma.users.count({ where: { email: normalized } });
  return count > 0;
}

export async function checkIdNumberExists(idNumber: string): Promise<boolean> {
  const value = String(idNumber ?? '').trim();
  if (!value) return false;
  if (!(await allowFromIp('lookup', LOOKUP_LIMIT))) return false;
  const count = await prisma.profiles.count({ where: { id_number: value } });
  return count > 0;
}

export type CityWithParishes = {
  id: number;
  name: string;
  parishes: Array<{ id: number; name: string }>;
};

/** Ciudades de Ecuador con sus parroquias, ordenadas alfabéticamente */
export async function getEcuadorLocations(): Promise<CityWithParishes[]> {
  return prisma.cities.findMany({
    where: { countries: { code: 'EC' } },
    select: {
      id: true,
      name: true,
      parishes: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });
}

export type RegisterUserInput = {
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  cityId: number | null;
  parishId: number | null;
  address: string;
  email: string;
  password: string;
  /** Aceptación de términos, privacidad y declaración de mayoría de edad */
  acceptTerms: boolean;
  /** Código de quien lo invitó (opcional) */
  referralCode?: string | null;
};

export async function registerUser(input: RegisterUserInput): Promise<ActionResult> {
  if (!(await allowFromIp('register', REGISTER_LIMIT))) {
    return { success: false, error: 'Demasiados registros desde esta conexión. Intenta más tarde.' };
  }

  const email = normalizeEmail(String(input.email ?? ''));
  const idNumber = String(input.idNumber ?? '').trim();
  const fullName = String(input.fullName ?? '').trim();
  const phoneNumber = String(input.phoneNumber ?? '').trim();
  const address = String(input.address ?? '').trim();
  const password = String(input.password ?? '');

  if (!fullName || fullName.length > 120) return { success: false, error: 'Ingresa tu nombre completo.' };
  const idError = getEcuadorianIdError(idNumber);
  if (idError) return { success: false, error: idError };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'El formato del correo electrónico no es válido.' };
  }
  if (!/^\+?[0-9\s-]{7,20}$/.test(phoneNumber)) {
    return { success: false, error: 'Ingresa un número de teléfono válido.' };
  }
  if (!address || address.length > 250) {
    return { success: false, error: 'Ingresa tu dirección.' };
  }
  const pwdError = passwordError(password);
  if (pwdError) return { success: false, error: pwdError };
  if (input.acceptTerms !== true) {
    return { success: false, error: 'Debes ser mayor de edad y aceptar los términos y la política de privacidad.' };
  }

  const cityId = Number.isInteger(input.cityId) ? input.cityId : null;
  const parishId = Number.isInteger(input.parishId) ? input.parishId : null;
  if (parishId) {
    const parish = await prisma.parishes.findUnique({ where: { id: parishId }, select: { city_id: true } });
    if (!parish || parish.city_id !== cityId) {
      return { success: false, error: 'La parroquia no corresponde a la ciudad seleccionada.' };
    }
  }

  const referralCode = input.referralCode ? String(input.referralCode).trim().toUpperCase() : null;
  const referrer = referralCode
    ? await prisma.profiles.findUnique({ where: { referral_code: referralCode }, select: { id: true } })
    : null;

  if (await prisma.users.count({ where: { email } })) {
    return { success: false, error: 'Este correo electrónico ya está registrado. Si ya tienes una cuenta, inicia sesión.' };
  }
  if (await prisma.profiles.count({ where: { id_number: idNumber } })) {
    return { success: false, error: 'Esta cédula ya está registrada en el sistema. Si ya tienes una cuenta, inicia sesión.' };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const created = await prisma.users.create({
      data: {
        email,
        password_hash: passwordHash,
        // Sin servicio de correo configurado, la cuenta queda verificada al registrarse
        email_verified_at: new Date(),
        terms_accepted_at: new Date(),
        profile: {
          create: {
            full_name: fullName,
            id_number: idNumber,
            phone_number: phoneNumber,
            email,
            city_id: cityId,
            parish_id: parishId,
            address,
            role: 'participant',
            referral_code: generateReferralCode(),
            referred_by: referrer?.id ?? null,
          },
        },
      },
    });
    await recordAudit({
      actorId: created.id,
      actorRole: 'participant',
      action: 'auth.register',
      entityType: 'user',
      entityId: created.id,
      data: { referred_by: referrer?.id ?? null },
    });
    return { success: true };
  } catch (error) {
    // Carrera entre dos registros con el mismo correo o cédula
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'El correo o la cédula ya están registrados.' };
    }
    console.error('[registerUser] error:', error);
    return { success: false, error: 'No pudimos crear tu cuenta. Intenta nuevamente.' };
  }
}

/**
 * Genera un enlace de recuperación de contraseña.
 * Mientras no haya un servicio de correo configurado, el enlace se imprime en la consola del servidor.
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const normalized = normalizeEmail(String(email ?? ''));
  if (!(await allowFromIp('reset', RESET_LIMIT)) || !checkRateLimit(`reset:${normalized}`, { limit: 3, windowMs: 60 * 60 * 1000 }).allowed) {
    return { success: false, error: 'Demasiadas solicitudes. Intenta nuevamente en una hora.' };
  }

  const user = await prisma.users.findUnique({ where: { email: normalized } });

  // Responder igual exista o no la cuenta, para no revelar qué correos están registrados
  if (!user || user.suspended_at) {
    return { success: true };
  }

  // Un solo enlace vigente por usuario
  await prisma.password_reset_tokens.updateMany({
    where: { user_id: user.id, used_at: null },
    data: { used_at: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  await prisma.password_reset_tokens.create({
    data: {
      user_id: user.id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const link = `${getBaseUrl()}/restablecer-clave?token=${token}`;
  try {
    await sendMail({
      to: normalized,
      subject: 'Restablece tu contraseña de TuSuerte',
      text: `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña. Abre este enlace (válido por 1 hora y de un solo uso):\n\n${link}\n\nSi no la solicitaste, ignora este mensaje: tu contraseña no cambiará.\n\nEquipo TuSuerte`,
    });
  } catch (error) {
    console.error('[requestPasswordReset] no se pudo enviar el correo', error);
  }

  return { success: true };
}

export async function verifyPasswordResetToken(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length > 128) return false;
  const record = await prisma.password_reset_tokens.findUnique({
    where: { token_hash: hashToken(token) },
  });
  return Boolean(record && !record.used_at && record.expires_at > new Date());
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ActionResult> {
  const pwdError = passwordError(String(newPassword ?? ''));
  if (pwdError) return { success: false, error: pwdError };
  if (!token || typeof token !== 'string' || token.length > 128) {
    return { success: false, error: 'El enlace no es válido. Solicita uno nuevo.' };
  }

  const record = await prisma.password_reset_tokens.findUnique({
    where: { token_hash: hashToken(token) },
  });

  if (!record || record.used_at || record.expires_at <= new Date()) {
    return { success: false, error: 'El enlace expiró o ya fue usado. Solicita uno nuevo.' };
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Marcar el token como usado solo si sigue libre: evita usar el mismo enlace dos veces en paralelo
  const consumed = await prisma.$transaction(async (tx) => {
    const marked = await tx.password_reset_tokens.updateMany({
      where: { id: record.id, used_at: null },
      data: { used_at: new Date() },
    });
    if (marked.count === 0) return false;
    // Cambiar la versión de sesión cierra todas las sesiones abiertas de la cuenta
    await tx.users.update({
      where: { id: record.user_id },
      data: { password_hash: passwordHash, session_version: { increment: 1 }, must_change_password: false },
    });
    return true;
  });

  if (!consumed) {
    return { success: false, error: 'El enlace expiró o ya fue usado. Solicita uno nuevo.' };
  }

  await recordAudit({ actorId: record.user_id, action: 'auth.password_reset', entityType: 'user', entityId: record.user_id });
  return { success: true };
}

/** Cambia la contraseña del usuario autenticado verificando la actual */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: 'Debes iniciar sesión.' };

  const pwdError = passwordError(String(newPassword ?? ''));
  if (pwdError) return { success: false, error: pwdError };

  if (!checkRateLimit(`change-password:${userId}`, { limit: 5, windowMs: 15 * 60 * 1000 }).allowed) {
    return { success: false, error: 'Demasiados intentos. Espera unos minutos.' };
  }

  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || (session.user.sessionVersion ?? 0) !== user.session_version) {
    return { success: false, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };
  }
  if (!(await bcrypt.compare(String(currentPassword ?? ''), user.password_hash))) {
    return { success: false, error: 'La contraseña actual es incorrecta.' };
  }
  if (currentPassword === newPassword) {
    return { success: false, error: 'La nueva contraseña debe ser distinta de la actual.' };
  }

  // Invalida todas las sesiones (incluida la actual): el usuario vuelve a iniciar sesión
  await prisma.users.update({
    where: { id: userId },
    data: { password_hash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), session_version: { increment: 1 }, must_change_password: false },
  });
  await recordAudit({ actorId: userId, action: 'auth.password_change', entityType: 'user', entityId: userId });

  return { success: true };
}
