'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '../../hooks/use-toast'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'

interface PaymentTransaction {
  id: string
  user_id: string
  payment_method_id: string
  transaction_type: string
  amount: number
  currency: string
  raffle_id?: string | null
  subscription_id?: string | null
  stripe_payment_intent_id?: string | null
  stripe_payment_status?: string | null
  receipt_url?: string | null
  receipt_reference?: string | null
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'processing'
    | 'completed'
    | 'failed'
  reviewed_by?: string | null
  reviewed_at?: string | null
  admin_comment?: string | null
  rejection_reason?: string | null
  metadata?: any
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string
    email: string
    id_number: string
  } | null
  payment_methods?: {
    name: string
    type: string
    icon?: string | null
  } | null
  raffles?: {
    title: string
  } | null
  subscriptions?: {
    plans: {
      name: string
    } | null
  } | null
}

interface PaymentTransactionsManagementProps {
  readonly initialTransactions: PaymentTransaction[]
}

const formatCurrencyValue = (value: number, currency: string) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value)

export default function PaymentTransactionsManagement({ initialTransactions }: PaymentTransactionsManagementProps) {
  const router = useRouter()
  const [transactions] = useState<PaymentTransaction[]>(initialTransactions)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null)
  const [reviewingTransaction, setReviewingTransaction] =
    useState<PaymentTransaction | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(
    null
  )
  const [comment, setComment] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  // Obtener métodos de pago únicos
  const uniquePaymentMethods = Array.from(
    new Set(transactions.map((t) => t.payment_methods?.type).filter(Boolean))
  );

  // Filtrar transacciones
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || transaction.payment_methods?.type === filterMethod;
    const matchesSearch =
      transaction.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.receipt_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesMethod && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: filteredTransactions.length,
    pending: filteredTransactions.filter((t) => t.status === 'pending').length,
    approved: filteredTransactions.filter((t) => t.status === 'approved').length,
    completed: filteredTransactions.filter((t) => t.status === 'completed').length,
    rejected: filteredTransactions.filter((t) => t.status === 'rejected').length,
    failed: filteredTransactions.filter((t) => t.status === 'failed').length,
    totalRevenue: filteredTransactions
      .filter((t) => ['completed', 'approved'].includes(t.status))
      .reduce((sum, t) => sum + Number(t.amount), 0),
  };

  const getStatusBadge = (status: PaymentTransaction['status']) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'bg-yellow-500/10 text-yellow-500' },
      approved: { label: 'Aprobado', className: 'bg-green-500/10 text-green-500' },
      rejected: { label: 'Rechazado', className: 'bg-red-500/10 text-red-500' },
      processing: {
        label: 'Procesando',
        className: 'bg-blue-500/10 text-blue-500',
      },
      completed: {
        label: 'Completado',
        className: 'bg-green-600/10 text-green-600',
      },
      failed: { label: 'Fallido', className: 'bg-red-600/10 text-red-600' },
    }
    const variant = variants[status] || {
      label: status,
      className: 'bg-gray-500/10 text-gray-500',
    }

    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getMethodTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stripe: 'Stripe',
      manual_transfer: 'Transferencia Bancaria',
      qr_code: 'Código QR',
    };
    return labels[type] || type;
  };

  const handleReviewAction = (
    transaction: PaymentTransaction,
    action: 'approve' | 'reject'
  ) => {
    setReviewingTransaction(transaction)
    setReviewAction(action)
    setComment('')
    setRejectionReason('')
  }

  const handleSubmitReview = async () => {
    if (!reviewingTransaction || !reviewAction) return

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      showToast({
        type: 'error',
        description: 'Debes indicar el motivo del rechazo',
      })
      return
    }

    // Validación: solo se pueden revisar transferencias manuales y QR
    if (!['manual_transfer', 'qr_code'].includes(reviewingTransaction.payment_methods?.type || '')) {
      showToast({
        type: 'error',
        description: 'Solo se pueden revisar transferencias manuales y pagos QR',
      })
      return
    }

    try {
      // Importar las funciones de helpers
      const { approveManualPayment } = await import('../../lib/payments/approve-manual-payment')
      const { rejectManualPayment } = await import('../../lib/payments/approve-manual-payment')

      if (reviewAction === 'approve') {
        await approveManualPayment({
          transactionId: reviewingTransaction.id,
          adminComment: comment.trim() || undefined,
        })

        showToast({
          type: 'success',
          description: 'Pago aprobado y boleto creado exitosamente',
        })
      } else {
        await rejectManualPayment({
          transactionId: reviewingTransaction.id,
          rejectionReason: rejectionReason.trim(),
          adminComment: comment.trim() || undefined,
        })

        showToast({
          type: 'success',
          description: 'Pago rechazado correctamente',
        })
      }

      setReviewingTransaction(null)
      setReviewAction(null)
      setComment('')
      setRejectionReason('')
      // Refrescar la página para actualizar datos
      router.refresh()
    } catch (err: any) {
      console.error('Error reviewing transaction:', err)
      showToast({
        type: 'error',
        description: err.message || 'No se pudo procesar la revisión',
      })
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      raffle_ticket: '🎫 Boleto de Sorteo',
      subscription: '💎 Suscripción',
      plan_purchase: '💎 Compra de Plan',
      other: '💰 Otro',
    }
    return labels[type] || type
  }

  if (transactions.length === 0) {
    return <div className="flex justify-center p-8">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[color:var(--foreground)]">💳 Transacciones de Pago</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Revisa, aprueba o rechaza las transacciones de pago
          </p>
        </div>
        <div className="flex gap-2">
          {/* Panel de ayuda */}
          <details className="group rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <span>💡</span>
              <span>Ayuda</span>
              <span className="ml-auto transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t border-blue-200 px-4 py-3 dark:border-blue-800">
              <ul className="space-y-2 text-xs text-blue-900 dark:text-blue-200">
                <li className="flex gap-2">
                  <span>🔍</span>
                  <span>Busca por nombre de usuario, email o referencia</span>
                </li>
                <li className="flex gap-2">
                  <span>🎯</span>
                  <span>Filtra por estado (pendiente, aprobado, rechazado, completado)</span>
                </li>
                <li className="flex gap-2">
                  <span>💳</span>
                  <span>Filtra por método de pago (Stripe, transferencia manual)</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span>Aprueba transacciones manuales pendientes</span>
                </li>
                <li className="flex gap-2">
                  <span>✗</span>
                  <span>Rechaza transacciones con motivo para el usuario</span>
                </li>
                <li className="flex gap-2">
                  <span>📊</span>
                  <span>Las estadísticas se calculan automáticamente según los filtros</span>
                </li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-[color:var(--muted-foreground)]">Total</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--foreground)]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-yellow-600">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-blue-600">Aprobadas</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.approved}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-green-600">Completadas</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-red-600">Rechazadas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-[color:var(--muted-foreground)]">Ganancia Total</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Buscar por usuario, email, referencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder-[color:var(--muted-foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="processing">Procesando</option>
            <option value="completed">Completadas</option>
            <option value="failed">Fallidas</option>
          </select>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos los métodos</option>
            {uniquePaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                  Método
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                  Origen
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                  Fecha
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--foreground)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">💳</span>
                      <p className="text-sm font-medium text-[color:var(--foreground)]">
                        No hay transacciones
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {searchTerm || filterStatus !== 'all' || filterMethod !== 'all'
                          ? 'No se encontraron resultados con los filtros aplicados'
                          : 'Las transacciones aparecerán aquí cuando se procesen pagos'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="transition-colors hover:bg-[color:var(--muted)]/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[color:var(--foreground)]">
                          {transaction.profiles?.full_name || 'Sin nombre'}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {transaction.profiles?.email || 'Sin email'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[color:var(--foreground)]">
                          {transaction.currency} ${Number(transaction.amount).toFixed(2)}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-[color:var(--foreground)]">
                          {transaction.payment_methods?.name || 'N/A'}
                        </span>
                        {transaction.payment_methods?.type && (
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {getMethodTypeLabel(transaction.payment_methods.type)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {transaction.raffles ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[color:var(--foreground)]">
                            Sorteo
                          </span>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {transaction.raffles.title || transaction.raffle_id}
                          </span>
                        </div>
                      ) : transaction.subscriptions?.plans ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[color:var(--foreground)]">Plan</span>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {transaction.subscriptions.plans.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(transaction.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-[color:var(--foreground)]">
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {format(new Date(transaction.created_at), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction)
                            setShowDetailsModal(true)
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          Ver detalles
                        </button>
                        {transaction.status === 'pending' && 
                         ['manual_transfer', 'qr_code'].includes(transaction.payment_methods?.type || '') && (
                          <>
                            <button
                              onClick={() => handleReviewAction(transaction, 'approve')}
                              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 transition-colors hover:bg-green-100"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleReviewAction(transaction, 'reject')}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles */}
      {showDetailsModal && selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => {
            setShowDetailsModal(false)
            setSelectedTransaction(null)
          }}
        >
          <div
            className="w-full max-w-2xl my-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--border)] p-6">
              <h3 className="text-xl font-bold text-[color:var(--foreground)]">
                💳 Detalles de la Transacción
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedTransaction(null)
                }}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Usuario */}
              <div className="rounded-lg border border-[color:var(--border)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  👤 Información del Usuario
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Nombre:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedTransaction.profiles?.full_name || 'Sin nombre'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Email:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedTransaction.profiles?.email || 'Sin email'}
                    </span>
                  </div>
                  {selectedTransaction.profiles?.id_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Identificación:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {selectedTransaction.profiles.id_number}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transacción */}
              <div className="rounded-lg border border-[color:var(--border)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  💰 Información de la Transacción
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">ID:</span>
                    <span className="font-mono text-xs text-[color:var(--foreground)]">
                      {selectedTransaction.id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Monto:</span>
                    <span className="text-lg font-bold text-[color:var(--foreground)]">
                      {selectedTransaction.currency} ${Number(selectedTransaction.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Tipo:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {getTransactionTypeLabel(selectedTransaction.transaction_type)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Estado:</span>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Método:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedTransaction.payment_methods?.name || 'N/A'}
                    </span>
                  </div>
                  {selectedTransaction.payment_methods?.type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Tipo de método:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {getMethodTypeLabel(selectedTransaction.payment_methods.type)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Fecha:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {format(new Date(selectedTransaction.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sorteo asociado */}
              {selectedTransaction.raffles && (
                <div className="rounded-lg border border-[color:var(--border)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    🎟️ Sorteo Asociado
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--muted-foreground)]">ID:</span>
                      <span className="font-mono text-xs text-[color:var(--foreground)]">
                        {selectedTransaction.raffle_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--muted-foreground)]">Título:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {selectedTransaction.raffles.title || 'Sorteo sin nombre'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Suscripción asociada */}
              {selectedTransaction.subscriptions?.plans && (
                <div className="rounded-lg border border-[color:var(--border)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    📋 Suscripción Asociada
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">ID:</span>
                      <span className="font-mono text-xs text-[color:var(--foreground)]">
                        {selectedTransaction.subscription_id}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Plan:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {selectedTransaction.subscriptions.plans.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de comprobante */}
              {(selectedTransaction.receipt_reference ||
                selectedTransaction.receipt_url ||
                selectedTransaction.metadata?.notes ||
                typeof selectedTransaction.metadata?.amount_confirmed === 'number' ||
                typeof selectedTransaction.metadata?.tickets_requested === 'number') && (
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    📎 Información del Comprobante
                  </h4>
                  <div className="space-y-3">
                    {/* Imagen del comprobante */}
                    {selectedTransaction.receipt_url && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">Imagen del comprobante:</span>
                        <div className="rounded-lg border-2 border-[color:var(--border)] bg-[color:var(--muted)]/20 p-2">
                          <img
                            src={selectedTransaction.receipt_url}
                            alt="Comprobante de pago"
                            className="w-full h-auto max-h-96 object-contain rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="flex items-center justify-center p-8 text-[color:var(--muted-foreground)]"><span class="text-4xl">🖼️</span><p class="ml-3 text-sm">No se pudo cargar la imagen</p></div>';
                              }
                            }}
                          />
                        </div>
                        <a
                          href={selectedTransaction.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          <span>�</span>
                          <span>Ver en tamaño completo</span>
                          <span>↗</span>
                        </a>
                      </div>
                    )}
                    
                    {selectedTransaction.receipt_reference && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">Referencia / ID de Transacción:</span>
                        <div className="rounded bg-[color:var(--muted)]/30 p-2">
                          <span className="font-mono text-sm text-[color:var(--foreground)]">
                            {selectedTransaction.receipt_reference}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedTransaction.metadata?.notes && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">Notas del usuario:</span>
                        <div className="rounded bg-[color:var(--muted)]/30 p-2">
                          <p className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap">
                            {selectedTransaction.metadata.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedTransaction.metadata?.payment_type && (
                      <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                        <span>Tipo de pago:</span>
                        <span className="rounded bg-[color:var(--muted)] px-2 py-0.5 font-medium text-[color:var(--foreground)]">
                          {selectedTransaction.metadata.payment_type}
                        </span>
                      </div>
                    )}

                    {typeof selectedTransaction.metadata?.amount_confirmed === 'number' && (
                      <div className="flex items-center justify-between rounded border border-[color:var(--border)]/60 bg-[color:var(--muted)]/20 px-3 py-2">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                          Monto reportado:
                        </span>
                        <span className="text-sm font-bold text-[color:var(--foreground)]">
                          {formatCurrencyValue(
                            selectedTransaction.metadata.amount_confirmed,
                            selectedTransaction.currency || 'USD',
                          )}
                        </span>
                      </div>
                    )}

                    {typeof selectedTransaction.metadata?.tickets_requested === 'number' && (
                      <div className="flex items-center justify-between rounded border border-[color:var(--border)]/60 bg-[color:var(--muted)]/20 px-3 py-2">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                          Boletos reportados:
                        </span>
                        <span className="text-sm font-bold text-[color:var(--foreground)]">
                          {selectedTransaction.metadata.tickets_requested.toLocaleString('es-EC')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información de Stripe */}
              {(selectedTransaction.stripe_payment_intent_id || selectedTransaction.stripe_payment_status) && (
                <div className="rounded-lg border border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/10">
                  <h4 className="mb-3 text-sm font-semibold text-purple-800 dark:text-purple-300">
                    💳 Información de Stripe
                  </h4>
                  <div className="space-y-2">
                    {selectedTransaction.stripe_payment_intent_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700 dark:text-purple-300">Payment Intent:</span>
                        <span className="font-mono text-xs text-purple-900 dark:text-purple-200">
                          {selectedTransaction.stripe_payment_intent_id}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.stripe_payment_status && (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700 dark:text-purple-300">Estado:</span>
                        <span className="font-medium text-purple-900 dark:text-purple-200">
                          {selectedTransaction.stripe_payment_status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comentario del admin */}
              {selectedTransaction.admin_comment && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/10">
                  <h4 className="mb-2 text-sm font-semibold text-green-800 dark:text-green-300">
                    💬 Comentario del Admin
                  </h4>
                  <p className="text-sm text-green-900 dark:text-green-200">
                    {selectedTransaction.admin_comment}
                  </p>
                </div>
              )}

              {/* Motivo de rechazo */}
              {selectedTransaction.rejection_reason && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
                  <h4 className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">
                    ❌ Motivo de Rechazo
                  </h4>
                  <p className="text-sm text-red-900 dark:text-red-200">
                    {selectedTransaction.rejection_reason}
                  </p>
                </div>
              )}

              {/* Revisado por */}
              {selectedTransaction.reviewed_by && (
                <div className="rounded-lg border border-[color:var(--border)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    👨‍💼 Información de Revisión
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Revisado por:</span>
                      <span className="font-mono text-xs text-[color:var(--foreground)]">
                        {selectedTransaction.reviewed_by}
                      </span>
                    </div>
                    {selectedTransaction.reviewed_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[color:var(--muted-foreground)]">Fecha de revisión:</span>
                        <span className="font-medium text-[color:var(--foreground)]">
                          {format(new Date(selectedTransaction.reviewed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--border)] p-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedTransaction(null)
                }}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
              >
                Cerrar
              </button>
              {selectedTransaction.status === 'pending' && 
               ['manual_transfer', 'qr_code'].includes(selectedTransaction.payment_methods?.type || '') && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      handleReviewAction(selectedTransaction, 'approve')
                    }}
                    className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-green-600 hover:to-green-700"
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      handleReviewAction(selectedTransaction, 'reject')
                    }}
                    className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-red-600 hover:to-red-700"
                  >
                    ✗ Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revisión */}
      {reviewingTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => {
            setReviewingTransaction(null)
            setReviewAction(null)
            setComment('')
            setRejectionReason('')
          }}
        >
          <div
            className="w-full max-w-3xl my-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--border)] p-6">
              <h3 className="text-xl font-bold text-[color:var(--foreground)]">
                {reviewAction === 'approve'
                  ? '✓ Aprobar Transacción'
                  : '✗ Rechazar Transacción'}
              </h3>
              <button
                onClick={() => {
                  setReviewingTransaction(null)
                  setReviewAction(null)
                  setComment('')
                  setRejectionReason('')
                }}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Información de la transacción */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <h4 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  💰 Transacción a Revisar
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Usuario:</span>
                    <div className="rounded bg-white p-2 dark:bg-blue-950/50">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {reviewingTransaction.profiles?.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {reviewingTransaction.profiles?.email || 'Sin email'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Monto:</span>
                    <div className="rounded bg-white p-2 dark:bg-blue-950/50">
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                        {reviewingTransaction.currency} ${Number(reviewingTransaction.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {reviewingTransaction.payment_methods?.name || 'Método no especificado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagen del comprobante */}
              {reviewingTransaction.receipt_url && (
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                  <h4 className="mb-3 text-sm font-semibold text-purple-900 dark:text-purple-300">
                    📸 Comprobante de Pago
                  </h4>
                  <div className="space-y-3">
                    <div className="rounded-lg border-2 border-purple-300 bg-white p-2 dark:border-purple-700 dark:bg-purple-950/50">
                      <img
                        src={reviewingTransaction.receipt_url}
                        alt="Comprobante de pago"
                        className="w-full h-auto max-h-96 object-contain rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="flex items-center justify-center p-8 text-purple-600 dark:text-purple-400"><span class="text-4xl">🖼️</span><p class="ml-3 text-sm">No se pudo cargar la imagen</p></div>';
                          }
                        }}
                      />
                    </div>
                    <a
                      href={reviewingTransaction.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 p-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                    >
                      <span>🔍</span>
                      <span>Ver imagen en tamaño completo</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Información del comprobante */}
              {(reviewingTransaction.receipt_reference ||
                reviewingTransaction.metadata?.notes ||
                typeof reviewingTransaction.metadata?.amount_confirmed === 'number' ||
                typeof reviewingTransaction.metadata?.tickets_requested === 'number') && (
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    📋 Información del Comprobante
                  </h4>
                  <div className="space-y-3">
                    {reviewingTransaction.receipt_reference && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">Referencia / ID de Transacción:</span>
                        <div className="rounded bg-[color:var(--muted)]/30 p-2">
                          <span className="font-mono text-sm text-[color:var(--foreground)]">
                            {reviewingTransaction.receipt_reference}
                          </span>
                        </div>
                      </div>
                    )}
                    {reviewingTransaction.metadata?.notes && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">Notas del usuario:</span>
                        <div className="rounded bg-[color:var(--muted)]/30 p-2">
                          <p className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap">
                            {reviewingTransaction.metadata.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {typeof reviewingTransaction.metadata?.amount_confirmed === 'number' && (
                      <div className="flex items-center justify-between rounded border border-[color:var(--border)]/60 bg-[color:var(--muted)]/20 px-3 py-2">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                          Monto reportado:
                        </span>
                        <span className="text-sm font-bold text-[color:var(--foreground)]">
                          {formatCurrencyValue(
                            reviewingTransaction.metadata.amount_confirmed,
                            reviewingTransaction.currency || 'USD',
                          )}
                        </span>
                      </div>
                    )}

                    {typeof reviewingTransaction.metadata?.tickets_requested === 'number' && (
                      <div className="flex items-center justify-between rounded border border-[color:var(--border)]/60 bg-[color:var(--muted)]/20 px-3 py-2">
                        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                          Boletos reportados:
                        </span>
                        <span className="text-sm font-bold text-[color:var(--foreground)]">
                          {reviewingTransaction.metadata.tickets_requested.toLocaleString('es-EC')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Formulario de revisión */}
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <h4 className="mb-4 text-sm font-semibold text-[color:var(--foreground)]">
                  {reviewAction === 'approve' ? '✅ Aprobar Pago' : '❌ Rechazar Pago'}
                </h4>
                <div className="space-y-4">
                  {reviewAction === 'reject' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[color:var(--foreground)]">
                        Motivo del Rechazo *
                      </label>
                      <Textarea
                        placeholder="Ej: El comprobante no es legible, la transferencia no coincide con el monto, el ID de transacción es incorrecto..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        required
                        className="resize-none"
                      />
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        ⚠️ Este mensaje será visible para el usuario.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[color:var(--foreground)]">
                      Comentario Interno (opcional)
                    </label>
                    <Textarea
                      placeholder="Añade notas o comentarios para el equipo de administración..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      🔒 Solo visible para administradores.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--border)] p-6">
              <button
                onClick={() => {
                  setReviewingTransaction(null)
                  setReviewAction(null)
                  setComment('')
                  setRejectionReason('')
                }}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewAction === 'reject' && !rejectionReason.trim()}
                className={
                  reviewAction === 'approve'
                    ? 'rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }
              >
                {reviewAction === 'approve' ? '✓ Confirmar Aprobación' : '✗ Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
