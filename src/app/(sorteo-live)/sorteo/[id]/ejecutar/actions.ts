'use server';

import { executeRaffleDraw } from '../../../../../lib/raffle/raffle-algorithm';
import { requireRole } from '../../../../../lib/auth/get-user';

export async function executeRaffleDrawAction(raffleId: string) {
  await requireRole('admin');

  try {
    console.log('🎲 Iniciando ejecución de sorteo:', raffleId);
    const result = await executeRaffleDraw(raffleId);
    console.log('✅ Sorteo ejecutado exitosamente');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('❌ Error en executeRaffleDrawAction:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    return {
      success: false,
      error: error.message || 'Error al ejecutar el sorteo'
    };
  }
}
