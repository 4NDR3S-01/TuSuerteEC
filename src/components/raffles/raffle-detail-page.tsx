'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  checkRaffleEligibility,
  createManualTransferPayment,
  createStripeCheckoutSession,
} from '../../app/(app)/app/sorteos/[id]/actions';
import type { PaymentMethod, PaymentMethodConfig } from '../../lib/payments/types';

// Helper para traducir el modo de entrada
const getEntryModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    'subscribers_only': 'Solo Suscriptores',
    'tickets_only': 'Solo Boletos',
    'hybrid': 'Híbrido'
  };
  return labels[mode] || mode;
};

type Raffle = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly prize_description: string;
  readonly prize_category: string | null;
  readonly image_url: string | null;
  readonly draw_date: string;
  readonly status: string;
  readonly entry_mode: string;
  readonly max_entries_per_user: number | null;
};

type Entry = {
  readonly id: string;
  readonly ticket_number: string | null;
  readonly is_winner: boolean;
  readonly entry_source: string;
  readonly created_at: string;
};

type RaffleDetailPageProps = {
  raffle: Raffle;
  userEntries: Entry[];
  totalEntries: number;
  hasActiveSubscription: boolean;
  paymentMethods: PaymentMethod[];
};

type EligibilityResult = Awaited<ReturnType<typeof checkRaffleEligibility>>;

export function RaffleDetailPage({ 
  raffle, 
  userEntries, 
  totalEntries,
  hasActiveSubscription,
  paymentMethods,
}: RaffleDetailPageProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    paymentMethods.at(0)?.id ?? null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualReference, setManualReference] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualFeedback, setManualFeedback] = useState<{
    message: string;
    manual?: PaymentMethodConfig['manual'];
  } | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const drawDate = new Date(raffle.draw_date);
  const now = new Date();
  const daysUntil = Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isEndingSoon = daysUntil <= 3;
  const hasEnded = ['completed', 'cancelled', 'drawn'].includes(raffle.status);
  const isClosedForEntries = raffle.status !== 'active';
  const canParticipate = !isClosedForEntries;
  const allowsManualPurchase = raffle.entry_mode === 'hybrid' || raffle.entry_mode === 'tickets_only';
  const requiresSubscription = raffle.entry_mode === 'subscribers_only';
  const showsAutomaticEntry = hasActiveSubscription && raffle.entry_mode !== 'tickets_only';
  const isEligible = eligibility?.eligible ?? false;
  
  // Show participation count
  const userEntryCount = userEntries.length;

  const statusOverlayText = useMemo(() => {
    switch (raffle.status) {
      case 'completed':
        return '✓ FINALIZADO';
      case 'drawn':
        return '🎉 SORTEO EJECUTADO';
      case 'closed':
        return '⏳ SORTEO CERRADO';
      case 'cancelled':
        return '✕ CANCELADO';
      default:
        return null;
    }
  }, [raffle.status]);

  const participationStatusLabel = useMemo(() => {
    switch (raffle.status) {
      case 'active':
        return 'Activo';
      case 'closed':
        return 'Cerrado';
      case 'drawn':
        return 'Sorteado';
      case 'completed':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return raffle.status;
    }
  }, [raffle.status]);

  const participationStatusTone = useMemo(() => {
    switch (raffle.status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'closed':
        return 'text-amber-600 dark:text-amber-400';
      case 'drawn':
      case 'completed':
        return 'text-blue-600 dark:text-blue-400';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-[color:var(--foreground)]';
    }
  }, [raffle.status]);

  const unavailableMessage = useMemo(() => {
    switch (raffle.status) {
      case 'closed':
        return 'Sorteo cerrado. Estamos preparando la ejecución.';
      case 'drawn':
        return 'Sorteo ejecutado. Revisa la sección de ganadores.';
      case 'completed':
        return 'Sorteo finalizado.';
      case 'cancelled':
        return 'Este sorteo fue cancelado.';
      default:
        return 'Sorteo no disponible en este momento.';
    }
  }, [raffle.status]);

  const selectedMethod = useMemo(
    () => (selectedMethodId ? paymentMethods.find((method) => method.id === selectedMethodId) ?? null : null),
    [paymentMethods, selectedMethodId],
  );

  const selectedConfig = useMemo<PaymentMethodConfig>(
    () => (selectedMethod?.config ?? {}) as PaymentMethodConfig,
    [selectedMethod],
  );

  const selectedManualConfig = useMemo(
    () => selectedConfig.manual ?? {},
    [selectedConfig],
  );

  const methodAmount = selectedConfig.amount ?? null;
  const methodCurrency = selectedConfig.currency ?? 'USD';
  const isStripeMethod = selectedMethod?.type === 'stripe';
  const isManualMethod = selectedMethod?.type === 'manual_transfer';
  const hasPaymentMethods = paymentMethods.length > 0;
  const confirmDisabled =
    !isEligible ||
    !selectedMethod ||
    isProcessing ||
    (isManualMethod && Boolean(manualFeedback));

  const eligibilityMessage = useMemo(() => {
    if (!eligibility) return null;
    if (eligibility.eligible) {
      const current = eligibility.currentEntries ?? 0;
      if (eligibility.maxEntries) {
        return `Actualmente tienes ${current} de ${eligibility.maxEntries} entradas permitidas.`;
      }
      return 'Puedes registrar una nueva entrada en este sorteo.';
    }

    switch (eligibility.reason) {
      case 'not_authenticated':
        return 'Debes iniciar sesión para participar en este sorteo.';
      case 'subscription_required':
        return 'Necesitas una suscripción activa para participar en este sorteo.';
      case 'raffle_not_active':
        return 'El sorteo ya no admite nuevas participaciones.';
      case 'raffle_not_found':
        return 'No encontramos este sorteo. Recarga la página e inténtalo de nuevo.';
      case 'max_entries_reached':
        return `Ya alcanzaste el máximo de entradas permitidas (${eligibility.maxEntries ?? 'definido'}).`;
      case 'error_checking_entries':
        return 'No pudimos validar tus entradas actuales. Inténtalo más tarde.';
      default:
        return 'No pudimos confirmar tu elegibilidad en este momento.';
    }
  }, [eligibility]);

  useEffect(() => {
    if (!showPurchaseModal) {
      setEligibility(null);
      setManualFeedback(null);
      setManualError(null);
      setStripeError(null);
      setManualReference('');
      setManualNotes('');
      setIsProcessing(false);
      return;
    }

    if (paymentMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(paymentMethods[0].id);
    }

    let cancelled = false;
    setIsCheckingEligibility(true);
    setManualFeedback(null);
    setManualError(null);
    setStripeError(null);

    checkRaffleEligibility(raffle.id)
      .then((result) => {
        if (!cancelled) {
          setEligibility(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEligibility({
            eligible: false,
            reason: 'unknown_error',
          } as EligibilityResult);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingEligibility(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [raffle.id, showPurchaseModal, paymentMethods, selectedMethodId]);

  const handleOpenPurchaseModal = () => {
    if (paymentMethods.length > 0) {
      setSelectedMethodId(paymentMethods[0].id);
    }
    setShowPurchaseModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;

    setIsProcessing(true);
    setManualError(null);
    setStripeError(null);
    setManualFeedback(null);

    if (selectedMethod.type === 'stripe') {
      try {
        const result = await createStripeCheckoutSession(raffle.id, {
          paymentMethodId: selectedMethod.id,
        });

        if (result.success && result.url) {
          window.location.href = result.url;
          return;
        }

        setStripeError(result.error ?? 'No se pudo iniciar el pago con Stripe.');
      } catch (error) {
        console.error('[RaffleDetailPage] createStripeCheckoutSession error', error);
        setStripeError('Ocurrió un problema al contactar con Stripe. Intenta nuevamente.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (selectedMethod.type === 'manual_transfer') {
      try {
        const result = await createManualTransferPayment(raffle.id, {
          paymentMethodId: selectedMethod.id,
          reference: manualReference || undefined,
          notes: manualNotes || undefined,
        });

        if (result.success) {
          setManualFeedback({
            message: result.message ?? 'Solicitud registrada. Sigue las instrucciones para completar tu transferencia.',
            manual: (result.instructions as PaymentMethodConfig['manual']) ?? selectedManualConfig,
          });
        } else {
          setManualError(result.error ?? 'No pudimos registrar tu solicitud. Intenta más tarde.');
        }
      } catch (error) {
        console.error('[RaffleDetailPage] createManualTransferPayment error', error);
        setManualError('Ocurrió un error al crear la solicitud. Vuelve a intentarlo.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/app" className="text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)] transition-colors">
            Dashboard
          </Link>
          <span className="text-[color:var(--muted-foreground)]">/</span>
          <Link href="/app/sorteos" className="text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)] transition-colors">
            Sorteos
          </Link>
          <span className="text-[color:var(--muted-foreground)]">/</span>
          <span className="text-[color:var(--foreground)] font-semibold">{raffle.title}</span>
        </div>

        {/* Alert if ending soon */}
        {isEndingSoon && canParticipate && (
          <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">⏰</span>
              <div>
                <h3 className="font-bold text-red-600 dark:text-red-400">¡Sorteo por terminar!</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Solo quedan {daysUntil} día{daysUntil !== 1 ? 's' : ''} para participar
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Raffle Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Image */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[color:var(--border)] shadow-lg">
              {raffle.image_url ? (
                <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)] to-orange-500 flex items-center justify-center">
                  <span className="text-9xl">🎁</span>
                </div>
              )}
              {statusOverlayText && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-black text-center px-6">
                    {statusOverlayText}
                  </span>
                </div>
              )}
            </div>

            {/* Title and Description */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4">
              <div>
                <h1 className="text-3xl font-black text-[color:var(--foreground)] mb-2">{raffle.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] text-xs font-bold rounded-full">
                    {raffle.prize_category}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                    📅 {drawDate.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {canParticipate && (
                    <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full animate-pulse">
                      ● EN VIVO
                    </span>
                  )}
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <p className="text-[color:var(--muted-foreground)] leading-relaxed">{raffle.description}</p>
              </div>

              {/* Prize Details */}
              <div className="pt-4 border-t border-[color:var(--border)]">
                <h3 className="text-lg font-bold text-[color:var(--foreground)] mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span>Premio</span>
                </h3>
                <p className="text-[color:var(--muted-foreground)]">{raffle.prize_description}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[color:var(--foreground)]">Participaciones Totales</h3>
                <span className="text-sm font-bold text-[color:var(--accent)]">{totalEntries} participantes</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-[color:var(--muted)] rounded-lg">
                  <div className="text-2xl font-black text-[color:var(--accent)]">{totalEntries}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Total Entradas</div>
                </div>
                {Boolean(raffle.max_entries_per_user) && (
                  <div className="text-center p-3 bg-[color:var(--muted)] rounded-lg">
                    <div className="text-2xl font-black text-[color:var(--accent)]">{raffle.max_entries_per_user}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] mt-1">Máx. por Usuario</div>
                  </div>
                )}
              </div>
            </div>

            {/* User's Entries */}
            {userEntries.length > 0 && (
              <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[color:var(--foreground)] mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎟️</span>
                  <span>Tus Participaciones</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userEntries.map((entry, index) => (
                    <div key={entry.id} className="p-4 bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 border border-[color:var(--accent)]/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-[color:var(--muted-foreground)]">Participación #{index + 1}</div>
                          <div className="font-bold text-[color:var(--accent)]">{entry.ticket_number || `#${entry.id.slice(0, 8)}`}</div>
                          <div className="text-xs text-[color:var(--muted-foreground)] capitalize">
                            {entry.entry_source === 'subscription' ? '⭐ Suscripción' : '🎫 Boleto'}
                            {entry.is_winner && ' · 🏆 Ganador'}
                          </div>
                        </div>
                        <span className="text-3xl">🎫</span>
                      </div>
                      <div className="text-xs text-[color:var(--muted-foreground)] mt-2">
                        {new Date(entry.created_at).toLocaleDateString('es-EC')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold text-center">
                    ✓ Tienes {userEntries.length} participación{userEntries.length !== 1 ? 'es' : ''} en este sorteo
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            
            {/* Participation Card */}
            <div className="bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-6 sticky top-6 shadow-xl">
              
              {/* Entry Mode Info */}
              <div className="text-center mb-6 pb-6 border-b border-[color:var(--border)]">
                <div className="text-sm text-[color:var(--muted-foreground)] mb-2">Modo de Participación</div>
                <div className="text-2xl font-black text-[color:var(--accent)]">{getEntryModeLabel(raffle.entry_mode)}</div>
                {Boolean(raffle.max_entries_per_user) && (
                  <div className="text-xs text-[color:var(--muted-foreground)] mt-2">
                    Máximo {raffle.max_entries_per_user} {raffle.max_entries_per_user === 1 ? 'entrada' : 'entradas'} por usuario
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canParticipate ? (
                  <>
                    {showsAutomaticEntry && (
                      <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl text-center">
                        <div className="text-2xl mb-2">✓</div>
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          Participación automática activa
                        </div>
                        <div className="text-xs text-[color:var(--muted-foreground)] mt-1">
                          Tu suscripción te garantiza al menos una entrada.
                        </div>
                      </div>
                    )}

                    {allowsManualPurchase && hasPaymentMethods && (
                      <button
                        onClick={handleOpenPurchaseModal}
                        className="w-full py-4 rounded-xl font-bold transition-all text-white bg-gradient-to-r from-[color:var(--accent)] to-orange-500 hover:shadow-lg hover:scale-105"
                      >
                        Elegir método de pago
                      </button>
                    )}

                    {allowsManualPurchase && !hasPaymentMethods && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-xs text-amber-600 dark:text-amber-400">
                        No hay métodos de pago disponibles en este momento. Contacta al soporte para completar tu participación.
                      </div>
                    )}

                    {requiresSubscription && !hasActiveSubscription && (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
                        <div className="text-2xl mb-2">🔒</div>
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          Necesitas una suscripción activa
                        </div>
                        <div className="text-xs text-[color:var(--muted-foreground)] mt-1">
                          Suscríbete a un plan para participar en sorteos exclusivos.
                        </div>
                        <Link
                          href="/app/planes"
                          className="mt-3 inline-flex items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-500/20"
                        >
                          Ver planes disponibles
                        </Link>
                      </div>
                    )}

                    {!requiresSubscription && !hasActiveSubscription && (
                      <Link
                        href="/app/planes"
                        className="block w-full py-3 text-center border-2 border-[color:var(--accent)] text-[color:var(--accent)] rounded-xl font-bold hover:bg-[color:var(--accent)] hover:text-white transition-all"
                      >
                        Conocer planes de suscripción
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                    <div className="text-2xl mb-2">⚠️</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">
                      {unavailableMessage}
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-[color:var(--border)] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Modo</span>
                  <span className="font-semibold text-[color:var(--foreground)]">{getEntryModeLabel(raffle.entry_mode)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Total Participantes</span>
                  <span className="font-semibold text-[color:var(--foreground)]">{totalEntries}</span>
                </div>
                {userEntryCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Tus Entradas</span>
                    <span className="font-semibold text-[color:var(--accent)]">{userEntryCount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Estado</span>
                  <span className={`font-semibold ${participationStatusTone}`}>
                    {participationStatusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Share Card */}
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6">
              <h3 className="font-bold text-[color:var(--foreground)] mb-4 flex items-center gap-2">
                <span className="text-xl">📢</span>
                <span>Compartir</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📘</span>
                </button>
                <button className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-all group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">💬</span>
                </button>
                <button className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📎</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPurchaseModal(false)}
        >
          <div
            className="bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-black text-[color:var(--foreground)]">Selecciona un método de pago</h3>
                <p className="text-sm text-[color:var(--muted-foreground)] mt-2">
                  Escoge cómo deseas completar tu participación en este sorteo.
                </p>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="rounded-full border border-[color:var(--border)] px-2 py-1 text-xs font-semibold text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {isCheckingEligibility ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-[color:var(--muted-foreground)]">
                <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--accent)] border-r-transparent" />
                Verificando disponibilidad...
              </div>
            ) : (
              <div className="space-y-5">
                {eligibilityMessage && (
                  <div
                    className={`rounded-xl border p-4 text-sm ${
                      eligibility?.eligible
                        ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {eligibilityMessage}
                  </div>
                )}

                {stripeError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                    {stripeError}
                  </div>
                )}

                {manualError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                    {manualError}
                  </div>
                )}

                {!hasPaymentMethods ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-600 dark:text-amber-400">
                    No hay métodos de pago configurados para este sorteo. Contacta al administrador para completar tu compra.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                      {paymentMethods.map((method) => {
                        const isSelected = method.id === selectedMethodId;
                        const config = (method.config ?? {}) as PaymentMethodConfig;
                        const amount = config.amount ?? null;
                        const currency = config.currency ?? 'USD';
                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`text-left rounded-2xl border px-4 py-4 transition-all ${
                              isSelected
                                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10 shadow-lg'
                                : 'border-[color:var(--border)] bg-[color:var(--muted)]/20 hover:border-[color:var(--accent)]/40'
                            }`}
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-[color:var(--foreground)]">
                                  {method.icon ? `${method.icon} ${method.name}` : method.name}
                                </p>
                                {method.description && (
                                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)] line-clamp-2">
                                    {method.description}
                                  </p>
                                )}
                              </div>
                              <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                                isSelected ? 'border-[color:var(--accent)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--muted-foreground)]'
                              }`}>
                                {isSelected ? '✓' : ''}
                              </span>
                            </div>
                            {amount ? (
                              <p className="mt-3 text-xs font-semibold text-[color:var(--foreground)]">
                                Monto: {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {selectedMethod && (
                      <div className="space-y-4">
                        {selectedMethod.instructions && (
                          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4 text-xs text-[color:var(--muted-foreground)] whitespace-pre-line">
                            {selectedMethod.instructions}
                          </div>
                        )}

                        {isStripeMethod && (
                          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-600 dark:text-blue-400">
                            Serás redirigido a Stripe para completar el pago de forma segura. Una vez aprobado, tu boleto se generará automáticamente.
                          </div>
                        )}

                        {isManualMethod && (
                          <div className="space-y-4">
                            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4 text-xs text-[color:var(--muted-foreground)]">
                              <h4 className="text-sm font-semibold text-[color:var(--foreground)] mb-2">Datos para transferencia</h4>
                              <div className="space-y-1">
                                {selectedManualConfig.bankName && (
                                  <p><span className="font-semibold">Banco:</span> {selectedManualConfig.bankName}</p>
                                )}
                                {selectedManualConfig.accountNumber && (
                                  <p><span className="font-semibold">Cuenta:</span> {selectedManualConfig.accountNumber}</p>
                                )}
                                {selectedManualConfig.accountType && (
                                  <p><span className="font-semibold">Tipo de cuenta:</span> {selectedManualConfig.accountType}</p>
                                )}
                                {selectedManualConfig.beneficiary && (
                                  <p><span className="font-semibold">Beneficiario:</span> {selectedManualConfig.beneficiary}</p>
                                )}
                                {selectedManualConfig.identification && (
                                  <p><span className="font-semibold">Identificación:</span> {selectedManualConfig.identification}</p>
                                )}
                                {methodAmount ? (
                                  <p><span className="font-semibold">Monto:</span> {methodAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {methodCurrency}</p>
                                ) : null}
                                {selectedManualConfig.referenceFormat && (
                                  <p><span className="font-semibold">Referencia sugerida:</span> {selectedManualConfig.referenceFormat}</p>
                                )}
                              </div>
                              {selectedManualConfig.instructions && (
                                <p className="mt-3 whitespace-pre-line">
                                  {selectedManualConfig.instructions}
                                </p>
                              )}
                            </div>

                            {!manualFeedback && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)] block mb-1">
                                    Número de referencia (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    value={manualReference}
                                    onChange={(e) => setManualReference(e.target.value)}
                                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)] block mb-1">
                                    Notas para el administrador (opcional)
                                  </label>
                                  <textarea
                                    value={manualNotes}
                                    onChange={(e) => setManualNotes(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                  />
                                </div>
                              </div>
                            )}

                            {manualFeedback && (
                              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-xs text-green-600 dark:text-green-400">
                                <p className="font-semibold mb-2">{manualFeedback.message}</p>
                                <p>
                                  Nuestro equipo revisará tu comprobante y confirmará el pago. Guarda la referencia y envía el comprobante cuando se te solicite.
                                </p>
                                {manualFeedback.manual?.instructions && (
                                  <p className="mt-2 whitespace-pre-line text-[color:var(--foreground)]">
                                    {manualFeedback.manual.instructions}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={handleConfirmPayment}
                        disabled={confirmDisabled}
                        className={`w-full py-3 rounded-xl font-bold transition-all text-white bg-gradient-to-r from-[color:var(--accent)] to-orange-500 hover:shadow-lg ${
                          confirmDisabled ? 'opacity-60 cursor-not-allowed hover:scale-100' : 'hover:scale-105'
                        }`}
                      >
                        {isProcessing
                          ? 'Procesando...'
                          : isStripeMethod
                          ? 'Pagar con Stripe'
                          : manualFeedback
                          ? 'Solicitud registrada'
                          : 'Registrar solicitud de pago'}
                      </button>

                      <button
                        onClick={() => setShowPurchaseModal(false)}
                        className="w-full py-3 rounded-xl border border-[color:var(--border)] text-sm font-semibold text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
