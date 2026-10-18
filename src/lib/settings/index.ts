import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '../db';

/** Configuración del programa de referidos (editable desde el panel de administración) */
export type ReferralSettings = {
  enabled: boolean;
  /** Porcentaje de descuento del código que recibe quien refiere */
  percent: number;
  /** Días de vigencia del código */
  validityDays: number;
};

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = { enabled: true, percent: 10, validityDays: 90 };

export async function getReferralSettings(): Promise<ReferralSettings> {
  const row = await prisma.app_settings.findUnique({ where: { key: 'referral_program' } });
  const value = (row?.value ?? {}) as Partial<ReferralSettings>;
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_REFERRAL_SETTINGS.enabled,
    percent: Number.isFinite(value.percent) ? Number(value.percent) : DEFAULT_REFERRAL_SETTINGS.percent,
    validityDays: Number.isInteger(value.validityDays) ? Number(value.validityDays) : DEFAULT_REFERRAL_SETTINGS.validityDays,
  };
}

export async function saveReferralSettings(settings: ReferralSettings, updatedBy: string) {
  await prisma.app_settings.upsert({
    where: { key: 'referral_program' },
    update: { value: settings as unknown as Prisma.InputJsonValue, updated_by: updatedBy },
    create: { key: 'referral_program', value: settings as unknown as Prisma.InputJsonValue, updated_by: updatedBy },
  });
}
