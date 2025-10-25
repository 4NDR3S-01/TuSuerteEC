'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { executeRaffleDrawAction } from '../../app/(sorteo-live)/sorteo/[id]/ejecutar/actions';

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  status: string;
  total_winners: number;
  draw_seed: string | null;
  created_at: string;
  image_url: string | null;
  prize_category: string | null;
  profiles?: {
    full_name: string;
  };
};

type RaffleEntry = {
  id: string;
  user_id: string;
  ticket_number: string;
  entry_source: string;
  is_winner: boolean;
  created_at: string;
  profiles: {
    full_name: string;
  };
};

type RaffleStats = {
  totalEntries: number;
  totalWinners: number;
  recentEntries: RaffleEntry[];
};

type RaffleExecutionProps = {
  raffle: Raffle;
  stats: RaffleStats;
  existingWinners?: Winner[];
};

type Winner = {
  entry_id: string;
  user_id: string;
  ticket_number: string;
  prize_position: number;
  user_name?: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📱',
  vehicles: '🚗',
  travel: '✈️',
  cash: '💵',
  home: '🏠',
  entertainment: '🎮',
  sports: '⚽',
  other: '🎁',
};

export function RaffleExecution({ raffle, stats, existingWinners = [] }: RaffleExecutionProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [revealedWinners, setRevealedWinners] = useState<Winner[]>(existingWinners);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const handleExecuteDraw = async () => {
    if (raffle.status !== 'closed') {
      setError('El sorteo debe estar cerrado para ejecutar el sorteo');
      return;
    }

    if (stats.totalEntries === 0) {
      setError('No hay participaciones válidas para ejecutar el sorteo');
      return;
    }

    // Iniciar cuenta regresiva
    setIsCountingDown(true);
    setCountdown(5);
    
    // Cuenta regresiva de 5 a 1
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsCountingDown(false);
    setCountdown(null);
    setIsExecuting(true);
    setError(null);
    setRevealedWinners([]);
    setCurrentRevealIndex(-1);

    try {
      const result = await executeRaffleDrawAction(raffle.id);
      
      if (result.success && result.data) {
        setExecutionResult(result.data);
        
        // Obtener nombres de los ganadores desde la base de datos
        const winnersWithNames: Winner[] = [];
        
        for (const winner of result.data.winners) {
          // Buscar primero en recentEntries (cache local)
          let entry = stats.recentEntries.find(e => e.id === winner.entry_id);
          
          // Si no está en cache, usar el nombre del resultado si está disponible
          const userName = entry?.profiles?.full_name || winner.user_name || 'Participante';
          
          winnersWithNames.push({
            ...winner,
            user_name: userName
          });
        }
        
        // Revelar ganadores uno por uno con animación
        setShowConfetti(true);
        for (let i = 0; i < winnersWithNames.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos entre cada ganador
          setCurrentRevealIndex(i);
          setRevealedWinners(prev => [...prev, winnersWithNames[i]]);
        }
        
        // Mantener los ganadores en pantalla (sin recargar automáticamente)
      } else {
        setError(result.error || 'Error al ejecutar el sorteo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar el sorteo');
    } finally {
      setIsExecuting(false);
    }
  };

  const canExecute = raffle.status === 'closed' && stats.totalEntries > 0 && !executionResult && existingWinners.length === 0;
  const isAlreadyDrawn = (raffle.status === 'drawn' || raffle.status === 'completed') && existingWinners.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ top: '10%', left: '10%' }}></div>
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ top: '60%', right: '10%', animationDelay: '1s' }}></div>
        <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ bottom: '10%', left: '50%', animationDelay: '2s' }}></div>
      </div>

      {/* Confeti animado cuando hay ganador */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo / Título con animación pulsante */}
        <div className="mb-8 text-center animate-pulse">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-4 drop-shadow-2xl">
            🎲 TuSuerte
          </h1>
          <p className="text-2xl md:text-3xl text-white/90 font-semibold">
            Sorteo en Vivo
          </p>
          {!isExecuting && !isCountingDown && !executionResult && (
            <p className="text-lg text-yellow-300 mt-4 animate-bounce">
              ✨ ¡Prepárense para descubrir a los ganadores! ✨
            </p>
          )}
        </div>

        {/* Información del sorteo */}
        <div className="w-full max-w-4xl mb-12">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-6 mb-6">
              {raffle.image_url ? (
                <img
                  src={raffle.image_url}
                  alt={raffle.prize_description}
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white/30 shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-6xl shadow-xl">
                  {CATEGORY_ICONS[raffle.prize_category || 'other'] || '🎁'}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-4xl font-bold text-white mb-2">
                  {raffle.title}
                </h2>
                <p className="text-2xl text-yellow-300 font-semibold flex items-center gap-2">
                  🏆 {raffle.prize_description}
                </p>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/20">
                <p className="text-5xl font-bold text-white mb-2">{stats.totalEntries}</p>
                <p className="text-white/80 font-semibold">Participantes</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/20">
                <p className="text-5xl font-bold text-yellow-300 mb-2">{raffle.total_winners}</p>
                <p className="text-white/80 font-semibold">Ganadores</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/20">
                <p className="text-5xl font-bold text-green-300 mb-2">
                  {stats.totalEntries > 0 ? ((raffle.total_winners / stats.totalEntries) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-white/80 font-semibold">Probabilidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-8 bg-red-500/20 backdrop-blur-xl border border-red-500/50 rounded-2xl p-6 max-w-2xl w-full">
            <p className="text-red-100 text-center text-xl font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Botón de ejecución con efectos mejorados */}
        {canExecute && !isExecuting && !isCountingDown && (
          <div className="text-center">
            <button
              onClick={handleExecuteDraw}
              className="group relative px-16 py-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full text-white text-3xl font-black shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-110 transition-all duration-300 animate-bounce"
            >
              <span className="relative z-10">🎯 INICIAR SORTEO</span>
              <div className="absolute inset-0 rounded-full bg-white/20 blur-xl group-hover:blur-2xl transition-all"></div>
            </button>
            <p className="text-white/70 mt-4 text-lg animate-pulse">
              Haz clic para comenzar la emoción
            </p>
          </div>
        )}

        {/* Cuenta regresiva dramática */}
        {isCountingDown && countdown !== null && (
          <div className="text-center">
            <div className="relative w-64 h-64 mx-auto mb-6">
              <div className="absolute inset-0 border-8 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-t-yellow-400 border-r-orange-500 border-b-red-500 border-l-pink-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-9xl font-black text-white animate-bounce drop-shadow-2xl">
                  {countdown}
                </span>
              </div>
            </div>
            <p className="text-4xl text-white font-bold animate-pulse">
              ¡Preparando el sorteo!
            </p>
            <p className="text-2xl text-yellow-300 mt-4 animate-bounce">
              🎊 La suerte está por decidirse... 🎊
            </p>
          </div>
        )}

        {/* Animación de carga con mensajes dinámicos */}
        {isExecuting && !executionResult && (
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 border-8 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-t-yellow-400 border-r-orange-500 border-b-red-500 border-l-pink-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-pulse">
                🎲
              </div>
            </div>
            <p className="text-3xl text-white font-bold animate-pulse mb-4">
              🎰 Seleccionando ganadores...
            </p>
            <div className="space-y-2 text-xl text-yellow-300">
              <p className="animate-pulse" style={{ animationDelay: '0s' }}>✨ Mezclando participaciones...</p>
              <p className="animate-pulse" style={{ animationDelay: '0.5s' }}>🔮 Consultando a la suerte...</p>
              <p className="animate-pulse" style={{ animationDelay: '1s' }}>🎊 ¡Momento emocionante!</p>
            </div>
          </div>
        )}

        {/* Mostrar ganadores con efectos dramáticos */}
        {revealedWinners.length > 0 && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-5xl font-bold text-white mb-4 animate-pulse">
                🎉 ¡TENEMOS {revealedWinners.length > 1 ? 'GANADORES' : 'GANADOR'}! 🎉
              </h3>
              <p className="text-2xl text-yellow-300 animate-bounce">
                ✨ ¡Felicidades a los afortunados! ✨
              </p>
            </div>
            {revealedWinners.map((winner, index) => (
              <div
                key={winner.entry_id}
                className={`relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-8 shadow-2xl transform transition-all duration-1000 ${
                  index === currentRevealIndex ? 'scale-110 animate-bounce' : 'scale-100'
                }`}
              >
                {/* Efecto de brillo */}
                <div className="absolute inset-0 rounded-3xl bg-white/20 animate-pulse"></div>
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200">
                      <span className="text-5xl font-black text-orange-600">
                        #{winner.prize_position}
                      </span>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-white mb-2 drop-shadow-lg">
                        {winner.user_name}
                      </p>
                      <p className="text-2xl text-white/90 font-semibold">
                        🎫 Boleto: {winner.ticket_number}
                      </p>
                      {index === currentRevealIndex && (
                        <p className="text-xl text-yellow-200 font-bold mt-2 animate-pulse">
                          🌟 ¡Recién revelado! 🌟
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-8xl animate-spin-slow">
                    🏆
                  </div>
                </div>
              </div>
            ))}
            
            {/* Mensaje final cuando se revelan todos */}
            {revealedWinners.length === raffle.total_winners && !isExecuting && (
              <div className="text-center mt-12 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border-4 border-yellow-400">
                <p className="text-4xl font-bold text-white mb-4">
                  🎊 ¡Sorteo Completado! 🎊
                </p>
                <p className="text-2xl text-yellow-300">
                  Gracias a todos por participar
                </p>
                <p className="text-xl text-white/80 mt-4">
                  Los ganadores serán contactados pronto
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sorteo ya ejecutado - Mostrar ganadores existentes */}
        {isAlreadyDrawn && !isExecuting && existingWinners.length > 0 && (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-3xl p-8 border-4 border-blue-400">
              <div className="text-6xl mb-4 animate-bounce">✅</div>
              <p className="text-3xl text-white font-bold mb-4">
                Este sorteo ya fue ejecutado
              </p>
              <p className="text-xl text-blue-200">
                Los ganadores fueron seleccionados el {new Date(raffle.created_at).toLocaleDateString('es-EC')}
              </p>
            </div>

            {/* Lista de ganadores */}
            <div className="space-y-6 mt-8">
              <h3 className="text-4xl font-bold text-center text-white mb-8">
                🏆 Ganadores del Sorteo 🏆
              </h3>
              {existingWinners.map((winner, index) => (
                <div
                  key={winner.entry_id}
                  className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-8 shadow-2xl"
                >
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 rounded-3xl bg-white/10"></div>
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200">
                        <span className="text-5xl font-black text-orange-600">
                          #{winner.prize_position}
                        </span>
                      </div>
                      <div>
                        <p className="text-4xl font-black text-white mb-2 drop-shadow-lg">
                          {winner.user_name || 'Participante'}
                        </p>
                        <p className="text-2xl text-white/90 font-semibold">
                          🎫 Boleto: {winner.ticket_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-8xl animate-spin-slow">
                      🏆
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(250, 204, 21, 0.8), 0 0 60px rgba(251, 146, 60, 0.6);
          }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
