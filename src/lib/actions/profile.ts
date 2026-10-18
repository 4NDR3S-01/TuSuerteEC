'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { getCurrentUser } from '../auth/get-user';
import { recordAudit } from '../audit';
import { checkRateLimit } from '../security/rate-limit';

// Forma plana (sin unión discriminada) porque el proyecto compila con `strict: false`
type ActionResult = { success: boolean; error?: string; field?: 'email' | 'currentPassword'; emailChanged?: boolean };

export type UpdateProfileInput = {
  email: string;
  full_name: string;
  phone_number: string;
  address: string;
  /** Obligatoria solo para cambiar el correo (protege la cuenta si alguien usa una sesión abierta) */
  current_password?: string;
};

/** Actualiza los datos del perfil del usuario autenticado (la cédula no se puede cambiar) */
export async function updateMyProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };

  const fullName = String(input.full_name ?? '').trim();
  if (!fullName || fullName.length > 120) {
    return { success: false, error: 'El nombre completo es requerido' };
  }

  const phoneNumber = String(input.phone_number ?? '').trim();
  if (!/^\+?[0-9\s-]{7,20}$/.test(phoneNumber)) {
    return { success: false, error: 'Ingresa un número de teléfono válido' };
  }

  const address = String(input.address ?? '').trim();
  if (address.length > 250) {
    return { success: false, error: 'La dirección es demasiado larga' };
  }

  const email = String(input.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'El formato del correo electrónico no es válido', field: 'email' };
  }

  const emailChanged = email !== user.email.toLowerCase();

  if (emailChanged) {
    if (!checkRateLimit(`email-change:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 }).allowed) {
      return { success: false, error: 'Demasiados intentos. Intenta más tarde.' };
    }
    const account = await prisma.users.findUnique({ where: { id: user.id }, select: { password_hash: true } });
    if (!account || !(await bcrypt.compare(String(input.current_password ?? ''), account.password_hash))) {
      return { success: false, error: 'Para cambiar el correo confirma tu contraseña actual.', field: 'currentPassword' };
    }
    const taken = await prisma.users.count({ where: { email, NOT: { id: user.id } } });
    if (taken > 0) {
      return { success: false, error: 'Este correo electrónico ya está registrado por otro usuario', field: 'email' };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (emailChanged) {
        await tx.users.update({ where: { id: user.id }, data: { email } });
      }

      await tx.profiles.update({
        where: { id: user.id },
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          address,
          email,
          ...(emailChanged ? { previous_email: user.email } : {}),
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'Este correo electrónico ya está en uso', field: 'email' };
    }
    console.error('[updateMyProfile] error:', error);
    return { success: false, error: 'Error al actualizar el perfil. Intenta nuevamente.' };
  }

  if (emailChanged) {
    await recordAudit({ actorId: user.id, actorRole: user.role, action: 'user.email_change', entityType: 'user', entityId: user.id, data: { from: user.email, to: email } });
  }

  revalidatePath('/app/settings');
  return { success: true, emailChanged };
}

export type NotificationPreferences = {
  email_raffles: boolean;
  email_winners: boolean;
  email_subscription: boolean;
  email_marketing: boolean;
};

export async function getMyNotificationPreferences(): Promise<NotificationPreferences | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { notification_preferences: true },
  });
  return (profile?.notification_preferences as NotificationPreferences | null) ?? null;
}

export async function updateMyNotificationPreferences(preferences: NotificationPreferences): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Tu sesión expiró. Inicia sesión nuevamente.' };

  // Solo se guardan las claves conocidas, como booleanos
  const clean: NotificationPreferences = {
    email_raffles: Boolean(preferences?.email_raffles),
    email_winners: Boolean(preferences?.email_winners),
    email_subscription: Boolean(preferences?.email_subscription),
    email_marketing: Boolean(preferences?.email_marketing),
  };

  await prisma.profiles.update({
    where: { id: user.id },
    data: { notification_preferences: clean },
  });

  return { success: true };
}
