import { getSupabaseServerClient } from '../supabase/server';

export type RaffleDrawResult = {
  winners: Array<{
    entry_id: string;
    user_id: string;
    ticket_number: string;
    prize_position: number;
    user_name?: string;
  }>;
  drawSeed: string;
  totalParticipants: number;
  totalWinners: number;
};

/**
 * Algoritmo de ejecución de sorteos verificable
 * Genera una semilla aleatoria y selecciona ganadores de forma determinística
 */
export async function executeRaffleDraw(raffleId: string): Promise<RaffleDrawResult> {
  const supabase = await getSupabaseServerClient();
  
  // 1. Obtener datos del sorteo
  const { data: raffle, error: raffleError } = await supabase
    .from('raffles')
    .select('*')
    .eq('id', raffleId)
    .single();

  if (raffleError || !raffle) {
    throw new Error('Sorteo no encontrado');
  }

  if (raffle.status !== 'closed') {
    throw new Error('El sorteo debe estar cerrado para ejecutar el sorteo');
  }

  // 2. Obtener todas las participaciones válidas sin hacer JOIN
  // (obtendremos los nombres después en una query separada)
  console.log('🔍 Obteniendo participaciones para raffle_id:', raffleId);
  
  const { data: entries, error: entriesError } = await supabase
    .from('raffle_entries')
    .select('id, user_id, ticket_number, entry_source')
    .eq('raffle_id', raffleId)
    .eq('is_winner', false);

  console.log('📊 Resultado de la consulta:', { 
    entries: entries?.length || 0, 
    error: entriesError,
    data: entries
  });

  if (entriesError) {
    console.error('❌ Error detallado al obtener participaciones:', {
      message: entriesError.message,
      details: entriesError.details,
      hint: entriesError.hint,
      code: entriesError.code
    });
    throw new Error(`Error al obtener participaciones: ${entriesError.message}`);
  }

  if (!entries || entries.length === 0) {
    throw new Error('No hay participaciones válidas para el sorteo');
  }

  console.log('✅ Participaciones obtenidas:', entries.length);

  // Obtener los IDs únicos de usuarios
  const userIds = [...new Set(entries.map(e => e.user_id))];
  
  // Obtener los nombres de los usuarios en una consulta separada
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  // Crear un mapa de user_id -> full_name
  const profilesMap = new Map(
    (profiles || []).map(p => [p.id, p.full_name])
  );

  // Transformar los datos para asegurar el tipo correcto
  const typedEntries = entries.map(entry => ({
    id: entry.id,
    user_id: entry.user_id,
    ticket_number: entry.ticket_number,
    entry_source: entry.entry_source,
    profiles: profilesMap.has(entry.user_id) 
      ? { full_name: profilesMap.get(entry.user_id)! }
      : null
  }));
  
  console.log('🔄 Entradas transformadas:', typedEntries.length);

  // 3. Filtrar participaciones según la modalidad del sorteo
  let validEntries = typedEntries;
  
  if (raffle.entry_mode === 'subscribers_only') {
    // Solo suscriptores
    validEntries = typedEntries.filter(e => e.entry_source === 'subscription');
    
    if (validEntries.length === 0) {
      throw new Error('No hay participaciones de suscriptores válidas. Este sorteo es solo para suscriptores.');
    }
  } else if (raffle.entry_mode === 'tickets_only') {
    // Solo compra de boletos
    validEntries = typedEntries.filter(e => e.entry_source === 'manual_purchase');
    
    if (validEntries.length === 0) {
      throw new Error('No hay participaciones por compra de boletos válidas. Este sorteo es solo para compradores de boletos.');
    }
  }
  // Si es 'hybrid', se aceptan todas las participaciones (no se filtra)

  // 4. Generar semilla aleatoria verificable
  const drawSeed = generateVerifiableSeed();
  
  // 5. Seleccionar ganadores usando algoritmo determinístico
  const winners = selectWinners(validEntries, raffle.total_winners, drawSeed);
  
  // 6. Actualizar participaciones como ganadoras
  const winnerIds = winners.map(w => w.entry_id);
  const { error: updateError } = await supabase
    .from('raffle_entries')
    .update({ is_winner: true })
    .in('id', winnerIds);

  if (updateError) {
    throw new Error('Error al actualizar ganadores');
  }

  // 7. Crear registros de ganadores
  const winnerRecords = winners.map(winner => ({
    raffle_id: raffleId,
    entry_id: winner.entry_id,
    user_id: winner.user_id,
    prize_position: winner.prize_position,
    status: 'pending_contact' as const,
    contact_attempts: 0
  }));

  const { error: winnersError } = await supabase
    .from('winners')
    .insert(winnerRecords);

  if (winnersError) {
    throw new Error('Error al crear registros de ganadores');
  }

  // 8. Actualizar estado del sorteo
  const { error: raffleUpdateError } = await supabase
    .from('raffles')
    .update({ 
      status: 'drawn',
      draw_seed: drawSeed,
      updated_at: new Date().toISOString()
    })
    .eq('id', raffleId);

  if (raffleUpdateError) {
    throw new Error('Error al actualizar estado del sorteo');
  }

  return {
    winners,
    drawSeed,
    totalParticipants: entries.length,
    totalWinners: winners.length
  };
}

/**
 * Genera una semilla verificable combinando timestamp y datos del sorteo
 */
function generateVerifiableSeed(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const seed = `${timestamp}-${random}`;
  
  // Crear hash de la semilla para verificación
  return btoa(seed).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Selecciona ganadores usando algoritmo determinístico basado en la semilla
 */
function selectWinners(
  entries: Array<{ id: string; user_id: string; ticket_number: string; entry_source: string; profiles?: { full_name: string } | null }>,
  totalWinners: number,
  seed: string
): Array<{ entry_id: string; user_id: string; ticket_number: string; prize_position: number; user_name?: string }> {
  if (entries.length === 0 || totalWinners <= 0) {
    return [];
  }

  // Crear una copia de las participaciones para no modificar el original
  const availableEntries = [...entries];
  const winners: Array<{ entry_id: string; user_id: string; ticket_number: string; prize_position: number; user_name?: string }> = [];
  
  // Usar la semilla para generar números "aleatorios" determinísticos
  let seedNumber = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNumber += seed.charCodeAt(i);
  }

  for (let position = 1; position <= Math.min(totalWinners, availableEntries.length); position++) {
    // Generar índice "aleatorio" determinístico
    seedNumber = (seedNumber * 9301 + 49297) % 233280;
    const randomIndex = seedNumber % availableEntries.length;
    
    const selectedEntry = availableEntries[randomIndex];
    winners.push({
      entry_id: selectedEntry.id,
      user_id: selectedEntry.user_id,
      ticket_number: selectedEntry.ticket_number,
      prize_position: position,
      user_name: selectedEntry.profiles?.full_name || undefined
    });
    
    // Remover la entrada seleccionada para evitar duplicados
    availableEntries.splice(randomIndex, 1);
  }

  return winners;
}

/**
 * Verifica la validez de un sorteo ejecutado
 */
export function verifyRaffleDraw(
  entries: Array<{ id: string; user_id: string; ticket_number: string; entry_source: string }>,
  winners: Array<{ entry_id: string; user_id: string; ticket_number: string; prize_position: number }>,
  seed: string
): boolean {
  // Verificar que todos los ganadores sean participaciones válidas
  const entryIds = new Set(entries.map(e => e.id));
  const winnerIds = winners.map(w => w.entry_id);
  
  if (!winnerIds.every(id => entryIds.has(id))) {
    return false;
  }

  // Verificar que no hay duplicados en los ganadores
  const uniqueWinnerIds = new Set(winnerIds);
  if (uniqueWinnerIds.size !== winnerIds.length) {
    return false;
  }

  // Verificar que las posiciones de premio sean secuenciales
  const positions = winners.map(w => w.prize_position).sort((a, b) => a - b);
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== i + 1) {
      return false;
    }
  }

  // Re-ejecutar el algoritmo con la misma semilla para verificar
  const recreatedWinners = selectWinners(entries, winners.length, seed);
  const recreatedWinnerIds = recreatedWinners.map(w => w.entry_id).sort();
  const originalWinnerIds = winnerIds.sort();
  
  return JSON.stringify(recreatedWinnerIds) === JSON.stringify(originalWinnerIds);
}

/**
 * Obtiene estadísticas de un sorteo
 */
export async function getRaffleStats(raffleId: string) {
  const supabase = await getSupabaseServerClient();
  
  const [
    { count: totalEntries },
    { count: totalWinners },
    { data: entriesBySource }
  ] = await Promise.all([
    supabase.from('raffle_entries').select('*', { count: 'exact', head: true }).eq('raffle_id', raffleId),
    supabase.from('winners').select('*', { count: 'exact', head: true }).eq('raffle_id', raffleId),
    supabase.from('raffle_entries').select('entry_source').eq('raffle_id', raffleId)
  ]);

  // Contar por fuente de participación
  const sourceCounts = entriesBySource?.reduce((acc, entry) => {
    acc[entry.entry_source] = (acc[entry.entry_source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    totalEntries: totalEntries || 0,
    totalWinners: totalWinners || 0,
    entriesBySource: {
      subscription: sourceCounts.subscription || 0,
      manual_purchase: sourceCounts.manual_purchase || 0
    },
    winRate: totalEntries ? ((totalWinners || 0) / totalEntries * 100).toFixed(2) : '0'
  };
}
