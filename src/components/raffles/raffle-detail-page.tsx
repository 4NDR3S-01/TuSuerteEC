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

// Helper para traducir categorías de premios
const getPrizeCategoryLabel = (category: string | null): string => {
  if (!category) return 'Premio';
  
  const labels: Record<string, string> = {
    'electronics': 'Electrónica',
    'cash': 'Efectivo',
    'travel': 'Viajes',
    'vehicles': 'Vehículos',
    'experiences': 'Experiencias',
    'shopping': 'Compras',
    'home': 'Hogar',
    'entertainment': 'Entretenimiento',
    'other': 'Otro'
  };
  return labels[category] || category;
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
  readonly ticket_price: number | null;
  readonly stripe_price_id: string | null;
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [manualFeedback, setManualFeedback] = useState<{
    message: string;
    manual?: PaymentMethodConfig['manual'];
  } | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [priceValidationError, setPriceValidationError] = useState<string | null>(null);

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

  const selectedManualConfig: PaymentMethodConfig['manual'] = useMemo(
    () => selectedConfig.manual ?? {},
    [selectedConfig],
  );

  const selectedQrConfig: PaymentMethodConfig['qr'] = useMemo(
    () => selectedConfig.qr ?? {},
    [selectedConfig],
  );

  const methodCurrency = selectedConfig.currency ?? 'USD';
  const isStripeMethod = selectedMethod?.type === 'stripe';
  const isManualMethod = selectedMethod?.type === 'manual_transfer';
  const isQrMethod = selectedMethod?.type === 'qr_code';
  const hasPaymentMethods = paymentMethods.length > 0;
  
  const confirmDisabled =
    !isEligible ||
    !selectedMethod ||
    isProcessing ||
    Boolean(priceValidationError) ||
    ((isManualMethod || isQrMethod) && Boolean(manualFeedback));

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
      setReceiptFile(null);
      setReceiptPreview(null);
      setPriceValidationError(null);
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

  // Validar precios cuando se selecciona un método de pago
  useEffect(() => {
    if (!selectedMethod) {
      setPriceValidationError(null);
      return;
    }

    // Validar precios según el tipo de método de pago
    if (selectedMethod.type === 'stripe') {
      if (!raffle.stripe_price_id) {
        setPriceValidationError('⚠️ Este sorteo no tiene configurado un precio para pagos con Stripe. Contacta al administrador.');
      } else {
        setPriceValidationError(null);
      }
    } else if (selectedMethod.type === 'manual_transfer' || selectedMethod.type === 'qr_code') {
      if (!raffle.ticket_price || raffle.ticket_price <= 0) {
        setPriceValidationError('⚠️ Este sorteo no tiene configurado un precio válido. Contacta al administrador.');
      } else {
        setPriceValidationError(null);
      }
    } else {
      setPriceValidationError(null);
    }
  }, [selectedMethod, raffle.stripe_price_id, raffle.ticket_price]);

  const handleOpenPurchaseModal = () => {
    if (paymentMethods.length > 0) {
      setSelectedMethodId(paymentMethods[0].id);
    }
    setShowPurchaseModal(true);
  };

  const handleShare = (platform: 'facebook' | 'whatsapp' | 'copy') => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `¡Participa en el sorteo de ${raffle.prize_description}! 🎉`;
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
        break;
      case 'copy':
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            alert('¡Enlace copiado al portapapeles!');
          }).catch(() => {
            alert('No se pudo copiar el enlace');
          });
        }
        break;
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    // Validar tipo de archivo (solo imágenes)
    if (!file.type.startsWith('image/')) {
      setManualError('Solo se permiten archivos de imagen (JPG, PNG, etc.)');
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setManualError('El archivo no debe superar los 5MB');
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    setReceiptFile(file);
    setManualError(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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

    if (selectedMethod.type === 'manual_transfer' || selectedMethod.type === 'qr_code') {
      try {
        let receiptUrl: string | undefined;

        // Subir archivo a Supabase Storage si existe
        if (receiptFile) {
          const { getSupabaseBrowserClient } = await import('../../lib/supabase/client');
          const supabase = getSupabaseBrowserClient();
          
          // Obtener usuario actual
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setManualError('Debes iniciar sesión para continuar');
            setIsProcessing(false);
            return;
          }

          // Crear nombre único para el archivo
          const timestamp = Date.now();
          const fileExt = receiptFile.name.split('.').pop();
          const fileName = `${user.id}/${raffle.id}-${timestamp}.${fileExt}`;

          // Subir a Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-receipts')
            .upload(fileName, receiptFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('[RaffleDetailPage] Error uploading receipt:', uploadError);
            setManualError('Error al subir el comprobante. Intenta nuevamente.');
            setIsProcessing(false);
            return;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('payment-receipts')
            .getPublicUrl(uploadData.path);
          
          receiptUrl = publicUrl;
        }

        const result = await createManualTransferPayment(raffle.id, {
          paymentMethodId: selectedMethod.id,
          reference: manualReference || undefined,
          notes: manualNotes || undefined,
          receiptUrl,
        });

        if (result.success) {
          setManualFeedback({
            message: result.message ?? 'Solicitud registrada. Sigue las instrucciones para completar tu pago.',
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
            
            {/* Hero Image - Mejorada */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-[color:var(--border)] shadow-2xl group">
              {raffle.image_url ? (
                <div className="relative aspect-[16/10]">
                  <img 
                    src={raffle.image_url} 
                    alt={raffle.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  {/* Gradiente inferior para mejor legibilidad */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="aspect-[16/10] bg-gradient-to-br from-[color:var(--accent)] via-orange-500 to-red-500 flex items-center justify-center relative overflow-hidden">
                  {/* Patrón decorativo */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full" style={{
                      backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                      backgroundSize: '30px 30px'
                    }} />
                  </div>
                  <span className="text-9xl relative z-10 drop-shadow-2xl">🎁</span>
                </div>
              )}
              {statusOverlayText && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-white text-4xl font-black block mb-2">
                      {statusOverlayText}
                    </span>
                    <span className="text-white/80 text-sm">
                      {unavailableMessage}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Title and Stats Card - Rediseñado */}
            <div className="bg-gradient-to-br from-[color:var(--card)] to-[color:var(--muted)]/30 border border-[color:var(--border)] rounded-3xl p-8 space-y-6 shadow-lg">
              <div>
                <h1 className="text-4xl font-black text-[color:var(--foreground)] mb-4 leading-tight">{raffle.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                    <span className="text-lg">🏆</span>
                    {getPrizeCategoryLabel(raffle.prize_category)}
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold rounded-full shadow-lg">
                    <span className="text-lg">📅</span>
                    {drawDate.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {canParticipate && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-full shadow-lg animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                      EN VIVO
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid - Mejorado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-[color:var(--accent)]/10 to-orange-500/10 border border-[color:var(--accent)]/20 rounded-2xl">
                  <div className="text-3xl font-black text-[color:var(--accent)] mb-1">{totalEntries}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)] font-semibold">Participantes</div>
                </div>
                
                {Boolean(raffle.max_entries_per_user) && (
                  <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-2xl">
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">{raffle.max_entries_per_user}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] font-semibold">Máx. Entradas</div>
                  </div>
                )}

                {userEntryCount > 0 && (
                  <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-2xl">
                    <div className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">{userEntryCount}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] font-semibold">Mis Tickets</div>
                  </div>
                )}

                {daysUntil > 0 && canParticipate && (
                  <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl">
                    <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mb-1">{daysUntil}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] font-semibold">Días Restantes</div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="pt-4 border-t border-[color:var(--border)]">
                <p className="text-[color:var(--muted-foreground)] leading-relaxed text-base">{raffle.description}</p>
              </div>

              {/* Prize Details - Destacado */}
              <div className="pt-4 border-t border-[color:var(--border)]">
                <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-2 border-amber-500/30 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-[color:var(--foreground)] mb-3 flex items-center gap-3">
                    <span className="text-3xl">🏆</span>
                    <span>Premio a Ganar</span>
                  </h3>
                  <p className="text-[color:var(--foreground)] text-lg font-semibold">{raffle.prize_description}</p>
                </div>
              </div>
            </div>

            {/* User's Entries - Rediseñado */}
            {userEntries.length > 0 && (
              <div className="bg-gradient-to-br from-[color:var(--card)] to-[color:var(--muted)]/30 border border-[color:var(--border)] rounded-3xl p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-[color:var(--foreground)] flex items-center gap-3">
                    <span className="text-3xl">🎟️</span>
                    <span>Mis Participaciones</span>
                  </h3>
                  <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold text-sm shadow-lg">
                    {userEntries.length} {userEntries.length === 1 ? 'Ticket' : 'Tickets'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {userEntries.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className="relative p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-[color:var(--accent)]/30 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden"
                    >
                      {/* Patrón de fondo decorativo */}
                      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="w-full h-full" style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)',
                          backgroundSize: '10px 10px'
                        }} />
                      </div>

                      {/* Número de ticket destacado */}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                              #{index + 1}
                            </div>
                            <div className="font-black text-lg text-[color:var(--accent)] mb-1 font-mono tracking-tight">
                              {entry.ticket_number || `T-${entry.id.slice(0, 8).toUpperCase()}`}
                            </div>
                          </div>
                          <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform">
                            {entry.is_winner ? '🏆' : '🎫'}
                          </div>
                        </div>

                        {/* Tipo de entrada */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            entry.entry_source === 'subscription' 
                              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30' 
                              : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          }`}>
                            <span>{entry.entry_source === 'subscription' ? '⭐' : '🎟️'}</span>
                            <span>{entry.entry_source === 'subscription' ? 'Suscripción' : 'Boleto'}</span>
                          </span>
                          {entry.is_winner && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
                              <span>�</span>
                              <span>Ganador</span>
                            </span>
                          )}
                        </div>

                        {/* Fecha */}
                        <div className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-1">
                          <span>📅</span>
                          <span>{new Date(entry.created_at).toLocaleDateString('es-EC', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mensaje de confirmación */}
                <div className="p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✓</span>
                    <div>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        ¡Participación Confirmada!
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
                        Tienes {userEntries.length} {userEntries.length === 1 ? 'oportunidad' : 'oportunidades'} de ganar {raffle.prize_description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions Modernizado */}
          <div className="space-y-6 lg:sticky lg:top-28 lg:z-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">

            {/* Participation Card */}
            <div className="bg-gradient-to-br from-[color:var(--card)] to-[color:var(--muted)]/30 border-2 border-[color:var(--border)] rounded-3xl p-6 shadow-2xl">
              
              {/* Entry Mode Info */}
              <div className="text-center mb-6 pb-6 border-b-2 border-[color:var(--border)]">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 border border-[color:var(--accent)]/30 rounded-full mb-3">
                  <span className="text-sm font-semibold text-[color:var(--muted-foreground)]">
                    Modo de Participación
                  </span>
                </div>
                <div className="text-3xl font-black text-transparent bg-gradient-to-r from-[color:var(--accent)] to-orange-600 bg-clip-text">
                  {getEntryModeLabel(raffle.entry_mode)}
                </div>
                {Boolean(raffle.max_entries_per_user) && (
                  <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>📊</span>
                    <span>Máximo {raffle.max_entries_per_user} {raffle.max_entries_per_user === 1 ? 'entrada' : 'entradas'} por usuario</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canParticipate ? (
                  <>
                    {showsAutomaticEntry && (
                      <div className="p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-2xl text-center shadow-lg">
                        <div className="text-4xl mb-3">✓</div>
                        <div className="text-sm font-black text-green-600 dark:text-green-400 mb-2">
                          ¡Participación Automática Activa!
                        </div>
                        <div className="text-xs text-[color:var(--muted-foreground)]">
                          Tu suscripción te garantiza al menos una entrada.
                        </div>
                      </div>
                    )}

                    {allowsManualPurchase && hasPaymentMethods && (
                      <button
                        onClick={handleOpenPurchaseModal}
                        className="w-full py-4 px-6 rounded-2xl font-black text-lg transition-all text-white bg-gradient-to-r from-[color:var(--accent)] to-orange-600 hover:from-[color:var(--accent)]/90 hover:to-orange-700 shadow-2xl hover:shadow-[color:var(--accent)]/50 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>🎫</span>
                          <span>Elegir Método de Pago</span>
                        </span>
                      </button>
                    )}

                    {allowsManualPurchase && !hasPaymentMethods && (
                      <div className="p-5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 rounded-2xl text-center shadow-lg">
                        <div className="text-3xl mb-2">⚠️</div>
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          No hay métodos de pago disponibles en este momento. Contacta al soporte para completar tu participación.
                        </div>
                      </div>
                    )}

                    {requiresSubscription && !hasActiveSubscription && (
                      <div className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 rounded-2xl text-center shadow-lg">
                        <div className="text-4xl mb-3">🔒</div>
                        <div className="text-sm font-black text-purple-600 dark:text-purple-400 mb-2">
                          Necesitas una Suscripción Activa
                        </div>
                        <div className="text-xs text-[color:var(--muted-foreground)] mb-4">
                          Suscríbete a un plan para participar en sorteos exclusivos.
                        </div>
                        <Link
                          href="/app/planes"
                          className="inline-flex items-center justify-center rounded-xl border-2 border-purple-500/50 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-5 py-3 text-sm font-bold text-purple-600 dark:text-purple-400 transition-all hover:scale-105 hover:shadow-lg"
                        >
                          <span className="flex items-center gap-2">
                            <span>⭐</span>
                            <span>Ver Planes Disponibles</span>
                          </span>
                        </Link>
                      </div>
                    )}

                    {!requiresSubscription && !hasActiveSubscription && (
                      <Link
                        href="/app/planes"
                        className="flex w-full items-center justify-center gap-3 px-6 py-4 text-center text-lg font-black text-[color:var(--accent)] border-2 border-[color:var(--accent)] rounded-2xl hover:bg-[color:var(--accent)] hover:text-white transition-all transform hover:scale-[1.02] shadow-lg"
                      >
                        <span className="text-xl leading-none">⭐</span>
                        <span>Conocer Planes de Suscripción</span>
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="p-5 bg-gradient-to-r from-red-500/20 to-rose-500/20 border-2 border-red-500/40 rounded-2xl text-center shadow-lg">
                    <div className="text-4xl mb-3">⚠️</div>
                    <div className="text-sm font-black text-red-600 dark:text-red-400">
                      {unavailableMessage}
                    </div>
                  </div>
                )}
              </div>

              {/* Info - Rediseñado */}
              <div className="mt-6 pt-6 border-t-2 border-[color:var(--border)] space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl">
                  <span className="text-xs font-bold text-[color:var(--muted-foreground)] flex items-center gap-2">
                    <span>🎯</span>
                    <span>Modo</span>
                  </span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                    {getEntryModeLabel(raffle.entry_mode)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-xs font-bold text-[color:var(--muted-foreground)] flex items-center gap-2">
                    <span>👥</span>
                    <span>Total Participantes</span>
                  </span>
                  <span className="text-sm font-black text-green-600 dark:text-green-400">
                    {totalEntries}
                  </span>
                </div>
                {userEntryCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 border border-[color:var(--accent)]/30 rounded-xl">
                    <span className="text-xs font-bold text-[color:var(--muted-foreground)] flex items-center gap-2">
                      <span>🎟️</span>
                      <span>Mis Tickets</span>
                    </span>
                    <span className="text-sm font-black text-[color:var(--accent)]">
                      {userEntryCount}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                  <span className="text-xs font-bold text-[color:var(--muted-foreground)] flex items-center gap-2">
                    <span>📊</span>
                    <span>Estado</span>
                  </span>
                  <span className={`text-sm font-black ${participationStatusTone}`}>
                    {participationStatusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Share Card - Modernizado */}
            <div className="bg-gradient-to-br from-[color:var(--card)] to-[color:var(--muted)]/30 border-2 border-[color:var(--border)] rounded-3xl p-6 shadow-xl relative lg:z-30">
              <h3 className="font-black text-xl text-[color:var(--foreground)] mb-5 flex items-center gap-3">
                <span className="text-3xl">📢</span>
                <span>Compartir Sorteo</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border-2 border-blue-500/40 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform mb-1">📘</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Facebook</span>
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30 border-2 border-green-500/40 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform mb-1">💬</span>
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-600/20 hover:from-purple-500/30 hover:to-pink-600/30 border-2 border-purple-500/40 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform mb-1">📎</span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Copiar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowPurchaseModal(false)}
        >
          <div
            className="w-full max-w-2xl my-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--border)] p-6">
              <div>
                <h3 className="text-xl font-bold text-[color:var(--foreground)]">💳 Selecciona un método de pago</h3>
                <p className="text-sm text-[color:var(--muted-foreground)] mt-1">
                  Precio del boleto: <span className="font-bold text-[color:var(--accent)]">${raffle.ticket_price || '0.00'} USD</span>
                </p>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                aria-label="Cerrar"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
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

                {priceValidationError && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                    {priceValidationError}
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
                          </button>
                        );
                      })}
                    </div>

                    {selectedMethod && (
                      <div className="space-y-4">
                        {selectedMethod.instructions && (
                           <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-600 dark:text-blue-400">
                            {selectedMethod.instructions}
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
                                
                                {/* Campo de comprobante */}
                                <div>
                                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)] block mb-1">
                                    Comprobante de pago (opcional)
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleReceiptFileChange}
                                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[color:var(--accent)] file:text-[color:var(--accent-foreground)] hover:file:bg-[color:var(--accent)]/90"
                                  />
                                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                                    Sube una imagen del comprobante (JPG, PNG, máx. 5MB)
                                  </p>
                                  
                                  {receiptPreview && (
                                    <div className="mt-2">
                                      <img 
                                        src={receiptPreview} 
                                        alt="Vista previa del comprobante" 
                                        className="max-h-40 rounded-lg border border-[color:var(--border)]"
                                      />
                                    </div>
                                  )}
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

                        {isQrMethod && (
                          <div className="space-y-4">
                            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-xs text-purple-700 dark:text-purple-400">
                              <h4 className="text-sm font-semibold mb-2">
                                📱 Pago por código QR - {selectedQrConfig.provider || 'Código QR'}
                              </h4>
                              
                              {selectedQrConfig.qrImageUrl && (
                                <div className="flex justify-center my-4">
                                  <img 
                                    src={selectedQrConfig.qrImageUrl} 
                                    alt="Código QR para pago" 
                                    className="w-48 h-48 object-contain border-2 border-purple-500/30 rounded-lg bg-white p-2"
                                  />
                                </div>
                              )}

                              <div className="space-y-1 text-xs">
                                {selectedQrConfig.accountId && (
                                  <p><span className="font-semibold">ID de cuenta:</span> {selectedQrConfig.accountId}</p>
                                )}
                                {selectedQrConfig.accountName && (
                                  <p><span className="font-semibold">Titular:</span> {selectedQrConfig.accountName}</p>
                                )}
                              </div>

                              {selectedQrConfig.instructions && (
                                <p className="mt-3 whitespace-pre-line text-xs">
                                  {selectedQrConfig.instructions}
                                </p>
                              )}
                            </div>

                            {!manualFeedback && selectedQrConfig.requiresProof !== false && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)] block mb-1">
                                    Número de transacción (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    value={manualReference}
                                    onChange={(e) => setManualReference(e.target.value)}
                                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                    placeholder="Ingresa el ID de transacción"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)] block mb-1">
                                    Notas adicionales (opcional)
                                  </label>
                                  <textarea
                                    value={manualNotes}
                                    onChange={(e) => setManualNotes(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                    placeholder="Información adicional sobre tu pago"
                                  />
                                </div>

                                {/* Campo de comprobante QR */}
                                <div>
                                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)] block mb-1">
                                    Comprobante de pago (opcional)
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleReceiptFileChange}
                                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[color:var(--accent)] file:text-[color:var(--accent-foreground)] hover:file:bg-[color:var(--accent)]/90"
                                  />
                                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                                    Sube una captura de pantalla del pago (JPG, PNG, máx. 5MB)
                                  </p>
                                  
                                  {receiptPreview && (
                                    <div className="mt-2">
                                      <img 
                                        src={receiptPreview} 
                                        alt="Vista previa del comprobante" 
                                        className="max-h-40 rounded-lg border border-[color:var(--border)]"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {manualFeedback && (
                              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-xs text-green-600 dark:text-green-400">
                                <p className="font-semibold mb-2">{manualFeedback.message}</p>
                                <p>
                                  Nuestro equipo revisará tu comprobante de pago QR y confirmará la transacción. 
                                  {selectedQrConfig.requiresProof !== false && ' Asegúrate de guardar la captura de pantalla del pago.'}
                                </p>
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
                          ? 'Proceder con el pago'
                          : isQrMethod
                          ? (manualFeedback ? 'Solicitud registrada' : 'Registrar pago QR')
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
        </div>
      )}
    </div>
  );
}
