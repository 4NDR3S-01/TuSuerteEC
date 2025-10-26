'use client'

import {useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

// Supabase (usa solo un cliente para el navegador)
import { getSupabaseBrowserClient } from '../../lib/supabase/client'

// Toast
import { useToast } from '../../hooks/use-toast'

// Tipos actualizados
import type { 
  PaymentMethod, 
  PaymentMethodConfig, 
  PaymentMethodType, 
  PaymentScope 
} from '../../types/supabase'

// ===================== FormState =====================
interface FormState {
  id?: string
  name: string
  description: string
  icon: string
  type: PaymentMethodType
  is_active: boolean
  scopes: PaymentScope[]
  currency: string
  instructions: string
  manual: {
    bankName: string
    accountNumber: string
    accountType: string
    beneficiary: string
    identification: string
    instructions: string
    requiresProof: boolean
  }
  qr: {
    provider: string
    qrImageUrl: string
    accountId: string
    accountName: string
    instructions: string
    requiresProof: boolean
  }
}

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  description: '',
  icon: '',
  type: 'stripe',
  is_active: true,
  scopes: ['raffles'],
  currency: 'USD',
  instructions: '',
  manual: {
    bankName: '',
    accountNumber: '',
    accountType: '',
    beneficiary: '',
    identification: '',
    instructions: '',
    requiresProof: true,
  },
  qr: {
    provider: '',
    qrImageUrl: '',
    accountId: '',
    accountName: '',
    instructions: '',
    requiresProof: true,
  },
}

// ===================== Props =====================
export type FormMode = 'create' | 'edit'
export type PaymentMethodsManagementProps = {
  initialMethods: PaymentMethod[]
}

// ===================== Componente =====================
export default function PaymentMethodsManagement({
  initialMethods,
}: PaymentMethodsManagementProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods)
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [showFormModal, setShowFormModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { showToast } = useToast()

  // Derivados
  const activeMethods = useMemo(
    () => methods.filter((m) => m.is_active),
    [methods]
  )

  // ========= Utilidades de formulario =========
  const openCreateModal = () => {
    setFormState(DEFAULT_FORM_STATE)
    setFormMode('create')
    setShowFormModal(true)
  }

  const openEditModal = (method: PaymentMethod) => {
    const config = (method.config ?? {}) as unknown as PaymentMethodConfig
    setFormState({
      id: method.id,
      name: method.name,
      description: method.description ?? '',
      icon: method.icon ?? '',
      type: method.type as PaymentMethodType,
      is_active: method.is_active,
      scopes:
        Array.isArray(config.scopes) && config.scopes.length > 0
          ? config.scopes
          : ['raffles'],
      currency: config.currency ?? 'USD',
      instructions: method.instructions ?? '',
      manual: {
        bankName: config.manual?.bankName ?? '',
        accountNumber: config.manual?.accountNumber ?? '',
        accountType: config.manual?.accountType ?? '',
        beneficiary: config.manual?.beneficiary ?? '',
        identification: config.manual?.identification ?? '',
        instructions: config.manual?.instructions ?? '',
        requiresProof: config.manual?.requiresProof ?? true,
      },
      qr: {
        provider: config.qr?.provider ?? '',
        qrImageUrl: config.qr?.qrImageUrl ?? '',
        accountId: config.qr?.accountId ?? '',
        accountName: config.qr?.accountName ?? '',
        instructions: config.qr?.instructions ?? '',
        requiresProof: config.qr?.requiresProof ?? true,
      },
    })
    setFormMode('edit')
    setShowFormModal(true)
  }

  const closeFormModal = () => {
    setShowFormModal(false)
    setFormState(DEFAULT_FORM_STATE)
    setIsSaving(false)
  }

  const updateFormField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setFormState((prev) => {
      const newState = { ...prev, [field]: value }
      
      // Si cambia a transferencia manual o QR, solo permitir 'raffles'
      if (field === 'type' && (value === 'manual_transfer' || value === 'qr_code')) {
        newState.scopes = ['raffles']
      }
      
      return newState
    })
  }

  const toggleScope = (scope: PaymentScope, enabled: boolean) => {
    setFormState((prev) => {
      const current = new Set(prev.scopes)
      enabled ? current.add(scope) : current.delete(scope)
      const next = Array.from(current) as PaymentScope[]
      return { ...prev, scopes: next.length > 0 ? next : ['raffles'] }
    })
  }

  const mergeConfig = (): PaymentMethodConfig => {
    const base: PaymentMethodConfig = {
      scopes: formState.scopes,
      currency: formState.currency,
    }
    if (formState.type === 'stripe') {
      base.stripe = {
        mode: 'payment', // Se detecta automáticamente según el contexto
      }
    } else if (formState.type === 'manual_transfer') {
      base.manual = {
        bankName: formState.manual.bankName,
        accountNumber: formState.manual.accountNumber,
        accountType: formState.manual.accountType,
        beneficiary: formState.manual.beneficiary,
        identification: formState.manual.identification,
        instructions: formState.manual.instructions,
        requiresProof: formState.manual.requiresProof,
      }
    } else if (formState.type === 'qr_code') {
      base.qr = {
        provider: formState.qr.provider,
        qrImageUrl: formState.qr.qrImageUrl || undefined,
        accountId: formState.qr.accountId || undefined,
        accountName: formState.qr.accountName || undefined,
        instructions: formState.qr.instructions,
        requiresProof: formState.qr.requiresProof,
      }
    }
    return base
  }

  // ========= Acciones =========
  const upsertPaymentMethod = async () => {
    setIsSaving(true)
    try {
      let qrImageUrl = formState.qr.qrImageUrl;

      // Si es QR y hay una imagen en base64 (nueva), subirla a Storage
      if (formState.type === 'qr_code' && qrImageUrl && qrImageUrl.startsWith('data:')) {
        try {
          // Convertir base64 a Blob
          const response = await fetch(qrImageUrl);
          const blob = await response.blob();
          
          // Crear nombre único
          const timestamp = Date.now();
          const fileExt = blob.type.split('/')[1] || 'png';
          const fileName = `${formState.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${fileExt}`;

          // Subir a Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-qr-codes')
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('[PaymentMethods] Error uploading QR:', uploadError);
            alert('Error al subir el código QR. Intenta nuevamente.');
            setIsSaving(false);
            return;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('payment-qr-codes')
            .getPublicUrl(uploadData.path);
          
          qrImageUrl = publicUrl;
        } catch (error) {
          console.error('[PaymentMethods] Error processing QR image:', error);
          alert('Error al procesar la imagen del código QR');
          setIsSaving(false);
          return;
        }
      }

      // Actualizar el config con la URL real
      const baseConfig = mergeConfig();
      if (formState.type === 'qr_code' && baseConfig.qr) {
        baseConfig.qr.qrImageUrl = qrImageUrl || undefined;
      }

      const payload = {
        name: formState.name,
        description: formState.description || null,
        icon: formState.icon || null,
        type: formState.type,
        is_active: formState.is_active,
        instructions: formState.instructions || null,
        config: baseConfig,
      }

      if (formMode === 'create') {
        const { data, error } = await supabase
          .from('payment_methods')
          .insert(payload)
          .select(
            'id, name, type, description, icon, is_active, instructions, config, created_at, updated_at'
          )
          .single()
        if (error) throw error
        setMethods((prev) => [data as PaymentMethod, ...prev])
        showToast({ type: 'success', description: 'Método de pago creado.' })
      } else if (formState.id) {
        const { data, error } = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', formState.id)
          .select(
            'id, name, type, description, icon, is_active, instructions, config, created_at, updated_at'
          )
          .single()
        if (error) throw error
        setMethods((prev) =>
          prev.map((m) => (m.id === data.id ? (data as PaymentMethod) : m))
        )
        showToast({ type: 'success', description: 'Método de pago actualizado.' })
      }

      router.refresh()
      closeFormModal()
    } catch (error) {
      console.error('[admin][payment-methods] upsert error:', error)
      showToast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'No se pudo guardar el método de pago.',
      })
      setIsSaving(false)
    }
  }

  const toggleMethodStatus = async (method: PaymentMethod) => {
    const nextStatus = !method.is_active
    // optimista
    setMethods((prev) =>
      prev.map((item) => (item.id === method.id ? { ...item, is_active: nextStatus } : item))
    )

    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: nextStatus })
      .eq('id', method.id)

    if (error) {
      console.error('[admin][payment-methods] toggle error:', error)
      // revertir
      setMethods((prev) =>
        prev.map((item) => (item.id === method.id ? { ...item, is_active: method.is_active } : item))
      )
      showToast({ type: 'error', description: 'No se pudo actualizar el estado del método.' })
      return
    }

    showToast({
      type: 'success',
      description: `Método ${nextStatus ? 'activado' : 'desactivado'} correctamente.`,
    })
    router.refresh()
  }

  const deleteMethod = async (method: PaymentMethod) => {
    if (!confirm(`¿Estás seguro de eliminar "${method.name}"?`)) return
    setIsDeleting(method.id)
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', method.id)
      if (error) throw error
      setMethods((prev) => prev.filter((item) => item.id !== method.id))
      showToast({ type: 'success', description: 'Método eliminado.' })
      router.refresh()
    } catch (error) {
      console.error('[admin][payment-methods] delete error:', error)
      showToast({ type: 'error', description: 'No se pudo eliminar el método.' })
    } finally {
      setIsDeleting(null)
    }
  }

  // ========= Render =========
  const selectedType = formState.type

  const getTypeLabel = (type: PaymentMethodType) => {
    if (type === 'stripe') return 'Stripe'
    if (type === 'manual_transfer') return 'Transferencia manual'
    if (type === 'qr_code') return 'Código QR'
    return type
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--foreground)]">Métodos de pago</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Configura los métodos que los participantes verán al momento de pagar.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <span>＋</span>
          Nuevo método
        </button>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {methods.map((method) => {
          const config = (method.config ?? {}) as unknown as PaymentMethodConfig
          return (
            <div
              key={method.id}
              className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 transition-all hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{method.icon || '💳'}</span>
                    <h3 className="text-lg font-semibold text-[color:var(--foreground)]">{method.name}</h3>
                  </div>
                  <span className="mt-1 inline-flex items-center rounded-full bg-[color:var(--muted)]/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    {getTypeLabel(method.type as PaymentMethodType)}
                  </span>
                </div>

                <button
                  onClick={() => toggleMethodStatus(method)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    method.is_active
                      ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'border-[color:var(--border)] bg-[color:var(--muted)]/40 text-[color:var(--muted-foreground)]'
                  }`}
                >
                  {method.is_active ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              {method.description && (
                <p className="mt-3 text-xs text-[color:var(--muted-foreground)] line-clamp-3">{method.description}</p>
              )}

              {/* Meta */}
              <div className="mt-4 space-y-1 text-[10px] text-[color:var(--muted-foreground)]">
                <p>
                  <span className="font-semibold">Ámbitos:</span> {(config.scopes ?? ['raffles']).join(', ')}
                </p>
                {config.currency && (
                  <p>
                    <span className="font-semibold">Moneda:</span> {config.currency}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => openEditModal(method)}
                  className="flex-1 rounded-lg border border-[color:var(--border)] px-3 py-2 font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--muted)]/40"
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteMethod(method)}
                  className="flex-1 rounded-lg border border-red-500/40 px-3 py-2 font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
                  disabled={isDeleting === method.id}
                >
                  {isDeleting === method.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {methods.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/20 p-10 text-center text-sm text-[color:var(--muted-foreground)]">
          Aún no has configurado métodos de pago. Crea uno nuevo para que los participantes puedan completar sus compras.
        </div>
      )}

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-6">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Resumen rápido</h2>
        <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
          Métodos activos: <strong>{activeMethods.length}</strong> &bull; Total configurados:{' '}
          <strong>{methods.length}</strong>
        </p>
      </section>

      {/* Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--background)] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
                  {formMode === 'create' ? 'Nuevo método de pago' : 'Editar método de pago'}
                </h3>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Define la configuración que se mostrará a los participantes.
                </p>
              </div>
              <button
                onClick={closeFormModal}
                className="rounded-full border border-[color:var(--border)] px-2 py-1 text-xs font-semibold text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:grid-cols-[1fr_1.15fr]">
              {/* Columna A */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Nombre</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    placeholder="Nombre del método de pago"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Descripción (opcional)</label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Tipo</label>
                    <select
                      value={formState.type}
                      onChange={(e) => updateFormField('type', e.target.value as PaymentMethodType)}
                      className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                      <option value="stripe">Stripe</option>
                      <option value="manual_transfer">Transferencia manual</option>
                      <option value="qr_code">Código QR</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Icono (emoji/opcional)</label>
                    <input
                      type="text"
                      value={formState.icon}
                      onChange={(e) => updateFormField('icon', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      placeholder="💳"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Ámbitos disponibles</label>
                  <div className="mt-1 space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-3 text-xs">
                    <label className="flex items-center justify-between gap-3">
                      <span>Boletos de sorteos</span>
                      <input
                        type="checkbox"
                        checked={formState.scopes.includes('raffles')}
                        onChange={(e) => toggleScope('raffles', e.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span>Planes / Suscripciones</span>
                      <input
                        type="checkbox"
                        checked={formState.scopes.includes('plans')}
                        onChange={(e) => toggleScope('plans', e.target.checked)}
                        disabled={selectedType === 'manual_transfer' || selectedType === 'qr_code'}
                      />
                    </label>
                    {selectedType === 'manual_transfer' && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ <strong>Transferencia manual:</strong> Solo disponible para boletos de sorteos.
                      </p>
                    )}
                    {selectedType === 'qr_code' && (
                      <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                        ⚠️ <strong>Código QR:</strong> Solo disponible para boletos de sorteos.
                      </p>
                    )}
                    {selectedType === 'stripe' && (
                      <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        ✓ <strong>Stripe:</strong> Puede usarse para boletos y/o planes.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Moneda</label>
                  <input
                    type="text"
                    value={formState.currency}
                    onChange={(e) => updateFormField('currency', e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    placeholder="USD"
                  />
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    💡 Los precios se configuran directamente en cada sorteo o plan
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Texto auxiliar (opcional)</label>
                  <textarea
                    value={formState.instructions}
                    onChange={(e) => updateFormField('instructions', e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    placeholder="Se enviará un correo con los pasos a seguir..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formState.is_active}
                    onChange={(e) => updateFormField('is_active', e.target.checked)}
                  />
                  <label htmlFor="is_active" className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                    Método activo
                  </label>
                </div>
              </div>

              {/* Columna B */}
              <div className="space-y-4">
                {selectedType === 'stripe' ? (
                  <>
                    <h4 className="text-sm font-semibold text-[color:var(--foreground)]">
                      💳 Configuración de Stripe
                    </h4>
                    
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Pasarela personalizada con tu diseño
                          </p>
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                            Este método usa la API de Stripe con tu propio diseño y flujo personalizado. 
                            Funciona tanto para pagos únicos (boletos) como suscripciones (planes).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        ℹ️ <strong>Nota:</strong> Stripe detecta automáticamente si es pago único (boletos) o suscripción (planes) según el contexto. Las rutas de redirección y precios se configuran automáticamente.
                      </p>
                    </div>
                  </>
                ) : selectedType === 'manual_transfer' ? (
                  <>
                    <h4 className="text-sm font-semibold text-[color:var(--foreground)]">
                      🏦 Configuración de Transferencia Bancaria
                    </h4>
                    
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
                      <strong>💰 Cuenta bancaria:</strong> Configura los datos de tu cuenta bancaria para que los usuarios puedan realizar transferencias manuales.
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Banco *</label>
                        <input
                          type="text"
                          value={formState.manual.bankName}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, bankName: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          placeholder="Ej: Banco Pichincha"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Número de cuenta *</label>
                        <input
                          type="text"
                          value={formState.manual.accountNumber}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, accountNumber: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          placeholder="Ej: 1234567890"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Tipo de cuenta *</label>
                        <select
                          value={formState.manual.accountType}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, accountType: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          required
                        >
                          <option value="">Seleccionar...</option>
                          <option value="Ahorros">Ahorros</option>
                          <option value="Corriente">Corriente</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Beneficiario *</label>
                        <input
                          type="text"
                          value={formState.manual.beneficiary}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, beneficiary: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          placeholder="Ej: TuSuerte EC"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Cédula/RUC *</label>
                        <input
                          type="text"
                          value={formState.manual.identification}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, identification: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          placeholder="Ej: 1234567890001"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                        Instrucciones para el usuario *
                      </label>
                      <textarea
                        value={formState.manual.instructions}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            manual: { ...prev.manual, instructions: e.target.value },
                          }))
                        }
                        rows={5}
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder={`Ejemplo:\n\n1. Realiza la transferencia desde tu banco a la cuenta indicada.\n2. Usa la referencia proporcionada.\n3. Sube el comprobante de pago.\n4. Espera la confirmación del administrador (máx. 24 horas).`}
                        required
                      />
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                        Estas instrucciones se mostrarán al participante después de registrar la solicitud.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-3">
                      <input
                        id="manual_requires_proof"
                        type="checkbox"
                        checked={formState.manual.requiresProof}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            manual: { ...prev.manual, requiresProof: e.target.checked },
                          }))
                        }
                      />
                      <label htmlFor="manual_requires_proof" className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                        Requerir comprobante de pago
                      </label>
                    </div>
                  </>
                ) : selectedType === 'qr_code' ? (
                  <>
                    <h4 className="text-sm font-semibold text-[color:var(--foreground)]">
                      📱 Configuración de Código QR
                    </h4>
                    
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-xs text-purple-700 dark:text-purple-400">
                      <strong>🎯 Pago por QR:</strong> Configura los datos para pagos mediante código QR (Binance, Deuna, etc.). Los usuarios escanearán el código para realizar el pago.
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Proveedor *</label>
                        <input
                          type="text"
                          value={formState.qr.provider}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              qr: { ...prev.qr, provider: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          placeholder="Ej: Binance, Deuna - Banco Pichincha, PayPal"
                          required
                        />
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          Nombre del servicio o plataforma de pago por QR
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">ID de cuenta (opcional)</label>
                          <input
                            type="text"
                            value={formState.qr.accountId}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                qr: { ...prev.qr, accountId: e.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            placeholder="Email, teléfono, ID Binance..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Nombre del titular (opcional)</label>
                          <input
                            type="text"
                            value={formState.qr.accountName}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                qr: { ...prev.qr, accountName: e.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            placeholder="Ej: TuSuerte Ecuador"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Código QR (imagen) *</label>
                        <div className="mt-1 space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                // Crear URL temporal para previsualización
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setFormState((prev) => ({
                                    ...prev,
                                    qr: { ...prev.qr, qrImageUrl: reader.result as string },
                                  }))
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                            className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          />
                          {formState.qr.qrImageUrl && (
                            <div className="relative inline-block">
                              <img 
                                src={formState.qr.qrImageUrl} 
                                alt="Código QR" 
                                className="w-32 h-32 object-contain border border-[color:var(--border)] rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => setFormState((prev) => ({
                                  ...prev,
                                  qr: { ...prev.qr, qrImageUrl: '' },
                                }))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          Sube la imagen del código QR que los usuarios escanearán para pagar
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                          Instrucciones para el usuario *
                        </label>
                        <textarea
                          value={formState.qr.instructions}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              qr: { ...prev.qr, instructions: e.target.value },
                            }))
                          }
                          rows={5}
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                          placeholder={`Ejemplo:\n\n1. Escanea el código QR con tu aplicación ${formState.qr.provider || 'de pago'}.\n2. Completa el pago por el monto exacto mostrado.\n3. Guarda el comprobante de transacción.\n4. Sube una captura de pantalla del comprobante.\n5. Espera la confirmación (máx. 24 horas).`}
                          required
                        />
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          Estas instrucciones se mostrarán al participante junto con el código QR
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-3">
                        <input
                          id="qr_requires_proof"
                          type="checkbox"
                          checked={formState.qr.requiresProof}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              qr: { ...prev.qr, requiresProof: e.target.checked },
                            }))
                          }
                        />
                        <label htmlFor="qr_requires_proof" className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                          Requerir comprobante de pago
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[color:var(--border)] bg-[color:var(--background)] px-6 py-4">
              <button
                onClick={closeFormModal}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--muted)]/40"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={upsertPaymentMethod}
                className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] shadow hover:opacity-90 disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
