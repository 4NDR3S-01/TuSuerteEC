'use server';

import { revalidatePath } from 'next/cache';
import { executeRaffleDraw } from '../../../../../lib/raffle/raffle-algorithm';
import { requirePermission } from '../../../../../lib/auth/get-user';

export async function executeRaffleDrawAction(raffleId: string) {
  try {
    const actor = await requirePermission('raffles.draw');
    const result = await executeRaffleDraw(String(raffleId), actor);

    revalidatePath('/administrador/sorteos');
    revalidatePath(`/resultados/${raffleId}`);
    revalidatePath('/');

    return { success: true, data: result };
  } catch (error) {
    console.error('[executeRaffleDrawAction]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al ejecutar el sorteo',
    };
  }
}
