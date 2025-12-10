'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Calendar, X, Loader2, AlertTriangle } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

export function SubscriptionSettings({ subscriptions }: any) {
  const router = useRouter();
  const { showToast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!showCancelConfirm) {
      setShowCancelConfirm(subscriptionId);
      return;
    }

    setCancellingId(subscriptionId);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Actualizar la suscripción para cancelar al final del período
      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) {
        throw error;
      }

      showToast({
        type: 'success',
        description: 'Tu suscripción se cancelará al final del período actual. Seguirás teniendo acceso hasta entonces.',
      });

      setShowCancelConfirm(null);
      
      // Refrescar la página para mostrar los cambios
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Error cancelando suscripción:', error);
      showToast({
        type: 'error',
        description: error.message || 'Error al cancelar la suscripción. Intenta nuevamente.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[color:var(--foreground)] mb-1 sm:mb-2">Suscripciones</h2>
        <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Gestiona tus planes y métodos de pago</p>
      </div>
      
      {subscriptions.length === 0 ? (
        <div className="text-center py-10 sm:py-12 border-2 border-dashed border-[color:var(--border)] rounded-xl sm:rounded-2xl">
          <CreditCard className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-[color:var(--muted-foreground)]" />
          <h3 className="text-lg sm:text-xl font-bold mb-2 text-[color:var(--foreground)]">Sin Suscripciones Activas</h3>
          <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mb-4 sm:mb-6 px-4">Suscríbete para participar automáticamente en todos los sorteos</p>
          <Link href="/app/planes" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all">
            Ver Planes Disponibles
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {subscriptions.map((sub: any) => {
            const isCancelling = cancellingId === sub.id;
            const showConfirm = showCancelConfirm === sub.id;
            const isCancelled = sub.cancel_at_period_end;

            return (
              <div key={sub.id} className="p-4 sm:p-6 border-2 border-[color:var(--border)] rounded-xl hover:border-[color:var(--accent)]/50 dark:hover:border-[color:var(--accent)]/70 transition-all">
                {isCancelled && (
                  <div className="mb-3 p-2 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Esta suscripción se cancelará al final del período actual</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-[color:var(--foreground)] mb-1 sm:mb-2">{sub.plans?.name || 'Plan'}</h3>
                    <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Renovación: {new Date(sub.current_period_end).toLocaleDateString('es-EC', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xl sm:text-2xl font-black text-[color:var(--accent)]">${sub.plans?.price || 0}</div>
                    <div className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)]">/{sub.plans?.interval === 'month' ? 'mes' : 'año'}</div>
                  </div>
                </div>

                {showConfirm ? (
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mb-2">
                      ¿Estás seguro de que deseas cancelar esta suscripción? Seguirás teniendo acceso hasta el final del período.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancelSubscription(sub.id)}
                        disabled={isCancelling}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            <span>Cancelando...</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Confirmar Cancelación</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(null)}
                        disabled={isCancelling}
                        className="px-4 py-2 border border-[color:var(--border)] rounded-lg text-xs sm:text-sm font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--muted)] transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleCancelSubscription(sub.id)}
                    disabled={isCancelling || isCancelled}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{isCancelled ? 'Cancelación Programada' : 'Cancelar Suscripción'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
