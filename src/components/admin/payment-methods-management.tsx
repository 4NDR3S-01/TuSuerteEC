'use client'

import {useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

// Supabase (usa solo un cliente para el navegador)
import { getSupabaseBrowserClient } from '../../lib/supabase/client'

// Toast
import { useToast } from '../../hooks/use-toast'

// ===================== Tipos =====================
export type PaymentMethodType = 'stripe_card' | 'stripe_subscription' | 'manual_transfer'
export type PaymentScope = 'raffles' | 'plans'

export interface PaymentMethodConfig {
  scopes: PaymentScope[]
  currency: string
  amount?: number
  stripe_card?: {
    mode: 'payment'
    successPath: string
    cancelPath: string
  }
  stripe_subscription?: {
    checkoutUrl: string
    description?: string
  }
  manual?: {
    bankName: string
    accountNumber: string
    accountType: string
    beneficiary: string
    identification: string
    referenceFormat: string
    instructions: string
  }
}

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  description?: string | null
  icon?: string | null
  is_active: boolean
  instructions?: string | null
  config: PaymentMethodConfig
  created_at?: string
  updated_at?: string
}

interface FormState {
  id?: string
  name: string
  description: string
  icon: string
  type: PaymentMethodType
  is_active: boolean
  scopes: PaymentScope[]
  currency: string
  amount: string // como string para el input; se casterá al guardar
  instructions: string
  stripe_card: {
    successPath: string
    cancelPath: string
  }
  stripe_subscription: {
    checkoutUrl: string
    description: string
  }
  manual: {
    bankName: string
    accountNumber: string
    accountType: string
    beneficiary: string
    identification: string
    referenceFormat: string
    instructions: string
  }
}

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  description: '',
  icon: '',
  type: 'stripe_card',
  is_active: true,
  scopes: ['raffles'],
  currency: 'USD',
  amount: '',
  instructions: '',
  stripe_card: {
    successPath: '/app/boletos?payment=success',
    cancelPath: '/app/boletos?payment=cancelled',
  },
  stripe_subscription: {
    checkoutUrl: '',
    description: '',
  },
  manual: {
    bankName: '',
    accountNumber: '',
    accountType: '',
    beneficiary: '',
    identification: '',
    referenceFormat: 'Pago sorteo #{raffle_id}',
    instructions: '',
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
    const config = (method.config ?? {}) as PaymentMethodConfig
    setFormState({
      id: method.id,
      name: method.name,
      description: method.description ?? '',
      icon: method.icon ?? '',
      type: method.type,
      is_active: method.is_active,
      scopes:
        Array.isArray(config.scopes) && config.scopes.length > 0
          ? (config.scopes as PaymentScope[])
          : ['raffles'],
      currency: config.currency ?? 'USD',
      amount: config.amount != null ? String(config.amount) : '',
      instructions: method.instructions ?? '',
      stripe_card: {
        successPath:
          config.stripe_card?.successPath ?? '/app/boletos?payment=success',
        cancelPath:
          config.stripe_card?.cancelPath ?? '/app/boletos?payment=cancelled',
      },
      stripe_subscription: {
        checkoutUrl: config.stripe_subscription?.checkoutUrl ?? '',
        description: config.stripe_subscription?.description ?? '',
      },
      manual: {
        bankName: config.manual?.bankName ?? '',
        accountNumber: config.manual?.accountNumber ?? '',
        accountType: config.manual?.accountType ?? '',
        beneficiary: config.manual?.beneficiary ?? '',
        identification: config.manual?.identification ?? '',
        referenceFormat: config.manual?.referenceFormat ?? 'Pago sorteo #{raffle_id}',
        instructions: config.manual?.instructions ?? '',
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
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const updateScope = (scope: PaymentScope, enabled: boolean) => {
    setFormState((prev) => {
      const current = new Set(prev.scopes)
      enabled ? current.add(scope) : current.delete(scope)
      const next = Array.from(current)
      return { ...prev, scopes: next.length > 0 ? (next as PaymentScope[]) : ['raffles'] }
    })
  }

  const mergeConfig = (amount?: number): PaymentMethodConfig => {
    const base: PaymentMethodConfig = {
      scopes: formState.scopes,
      currency: formState.currency,
      amount,
    }
    if (formState.type === 'stripe_card') {
      base.stripe_card = {
        mode: 'payment',
        successPath: formState.stripe_card.successPath,
        cancelPath: formState.stripe_card.cancelPath,
      }
    } else if (formState.type === 'stripe_subscription') {
      base.stripe_subscription = {
        checkoutUrl: formState.stripe_subscription.checkoutUrl,
        description: formState.stripe_subscription.description || undefined,
      }
    } else if (formState.type === 'manual_transfer') {
      base.manual = {
        bankName: formState.manual.bankName,
        accountNumber: formState.manual.accountNumber,
        accountType: formState.manual.accountType,
        beneficiary: formState.manual.beneficiary,
        identification: formState.manual.identification,
        referenceFormat: formState.manual.referenceFormat,
        instructions: formState.manual.instructions,
      }
    }
    return base
  }

  // ========= Acciones =========
  const upsertPaymentMethod = async () => {
    setIsSaving(true)
    try {
      if (formState.amount && Number.isNaN(Number(formState.amount))) {
        throw new Error('El monto debe ser un número válido.')
      }
      const amountNumber = formState.amount ? Number(formState.amount) : undefined

      const payload = {
        name: formState.name,
        description: formState.description || null,
        icon: formState.icon || null,
        type: formState.type,
        is_active: formState.is_active,
        instructions: formState.instructions || null,
        config: mergeConfig(amountNumber),
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
    if (type === 'stripe_card') return 'Stripe Checkout (Tarjeta)'
    if (type === 'stripe_subscription') return 'Stripe Link (Suscripción)'
    if (type === 'manual_transfer') return 'Transferencia manual'
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
          const config = (method.config ?? {}) as PaymentMethodConfig
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
                    {getTypeLabel(method.type)}
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
                {config.amount != null && (
                  <p>
                    <span className="font-semibold">Monto base:</span>{' '}
                    {config.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
                    placeholder="Stripe Checkout"
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
                      <option value="stripe_card">Stripe Checkout (Tarjeta)</option>
                      <option value="stripe_subscription">Stripe Link (Suscripción)</option>
                      <option value="manual_transfer">Transferencia manual</option>
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
                        onChange={(e) => updateScope('raffles', e.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span>Planes / Suscripciones</span>
                      <input
                        type="checkbox"
                        checked={formState.scopes.includes('plans')}
                        onChange={(e) => updateScope('plans', e.target.checked)}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Moneda</label>
                    <input
                      type="text"
                      value={formState.currency}
                      onChange={(e) => updateFormField('currency', e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Monto base</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.amount}
                      onChange={(e) => updateFormField('amount', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />
                  </div>
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
                {selectedType === 'stripe_card' ? (
                  <>
                    <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Configuración de Stripe (Tarjeta)</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Ruta de éxito</label>
                        <input
                          type="text"
                          value={formState.stripe_card.successPath}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              stripe_card: { ...prev.stripe_card, successPath: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Ruta de cancelación</label>
                        <input
                          type="text"
                          value={formState.stripe_card.cancelPath}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              stripe_card: { ...prev.stripe_card, cancelPath: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-600 dark:text-blue-400">
                      <strong>Stripe con tu propio diseño:</strong> Las variables{' '}
                      <code className="bg-blue-500/20 px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> y{' '}
                      <code className="bg-blue-500/20 px-1 py-0.5 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{' '}
                      se tomarán de tu entorno. Configura tu pasarela con tu propio diseño.
                    </div>
                  </>
                ) : selectedType === 'stripe_subscription' ? (
                  <>
                    <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Configuración de Stripe Link</h4>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Link de Stripe (generado desde Stripe)</label>
                      <input
                        type="url"
                        value={formState.stripe_subscription.checkoutUrl}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            stripe_subscription: { ...prev.stripe_subscription, checkoutUrl: e.target.value },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder="https://buy.stripe.com/..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Descripción opcional</label>
                      <textarea
                        value={formState.stripe_subscription.description}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            stripe_subscription: { ...prev.stripe_subscription, description: e.target.value },
                          }))
                        }
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder="Información adicional..."
                      />
                    </div>
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-xs text-purple-600 dark:text-purple-400">
                      <strong>Suscripciones:</strong> Genera el link directamente desde tu dashboard de Stripe y pégalo aquí. Este link redirigirá a los usuarios a la pasarela de Stripe.
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Datos bancarios</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Banco</label>
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
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Número de cuenta</label>
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
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Tipo de cuenta</label>
                        <input
                          type="text"
                          value={formState.manual.accountType}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, accountType: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Beneficiario</label>
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
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Identificación</label>
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
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Formato de referencia</label>
                        <input
                          type="text"
                          value={formState.manual.referenceFormat}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              manual: { ...prev.manual, referenceFormat: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--muted-foreground)]">Instrucciones para el usuario</label>
                      <textarea
                        value={formState.manual.instructions}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            manual: { ...prev.manual, instructions: e.target.value },
                          }))
                        }
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder={`1. Realiza la transferencia desde tu banco.\n2. Usa la referencia indicada.`}
                      />
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
                      Las instrucciones se mostrarán al participante después de registrar la solicitud de pago.
                    </div>
                  </>
                )}
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
