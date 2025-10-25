'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

type Payment = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string | null;
  transaction_id: string | null;
  metadata: any;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  subscriptions: {
    id: string;
    plan_id: string;
    plans: {
      name: string;
    } | null;
  } | null;
};

type PaymentsTableProps = {
  payments: Payment[];
};

export function PaymentsTable({ payments: initialPayments }: PaymentsTableProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = getSupabaseBrowserClient();

  // Obtener métodos de pago únicos
  const uniquePaymentMethods = Array.from(
    new Set(payments.map((p) => p.payment_method).filter(Boolean))
  );

  // Filtrar pagos
  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || payment.payment_method === filterMethod;
    const matchesSearch =
      payment.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesMethod && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: filteredPayments.length,
    completed: filteredPayments.filter((p) => p.status === 'completed').length,
    pending: filteredPayments.filter((p) => p.status === 'pending').length,
    failed: filteredPayments.filter((p) => p.status === 'failed').length,
    refunded: filteredPayments.filter((p) => p.status === 'refunded').length,
    totalRevenue: filteredPayments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };

  const handleRefund = async () => {
    if (!selectedPayment || selectedPayment.status !== 'completed') return;

    setIsLoading(true);
    try {
      const refundMetadata = {
        ...(selectedPayment.metadata || {}),
        refund: {
          refunded_at: new Date().toISOString(),
          reason: refundReason,
          refunded_by: 'admin',
        },
      };

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
          metadata: refundMetadata,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      setPayments(
        payments.map((p) =>
          p.id === selectedPayment.id
            ? { ...p, status: 'refunded' as const, metadata: refundMetadata }
            : p
        )
      );

      showToast({
        type: 'success',
        description: 'Pago reembolsado exitosamente.',
      });

      setShowRefundModal(false);
      setShowDetailsModal(false);
      setSelectedPayment(null);
      setRefundReason('');
      router.refresh();
    } catch (error) {
      console.error('Error al reembolsar pago:', error);
      showToast({
        type: 'error',
        description: 'Error al procesar el reembolso. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Usuario',
      'Email',
      'Monto',
      'Moneda',
      'Estado',
      'Método de Pago',
      'Transaction ID',
      'Suscripción',
      'Plan',
      'Fecha',
    ];

    const rows = filteredPayments.map((payment) => [
      payment.id,
      payment.profiles?.full_name || 'N/A',
      payment.profiles?.email || 'N/A',
      payment.amount,
      payment.currency,
      payment.status,
      payment.payment_method || 'N/A',
      payment.transaction_id || 'N/A',
      payment.subscription_id || 'N/A',
      payment.subscriptions?.plans?.name || 'N/A',
      new Date(payment.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast({
      type: 'success',
      description: 'Pagos exportados exitosamente.',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      refunded: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    const labels = {
      pending: 'Pendiente',
      completed: 'Completado',
      failed: 'Fallido',
      refunded: 'Reembolsado',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-300'
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[color:var(--foreground)]">💳 Pagos</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Gestiona todas las transacciones y reembolsos
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
                  <span>Busca por nombre de usuario, email o transaction ID</span>
                </li>
                <li className="flex gap-2">
                  <span>🎯</span>
                  <span>Filtra por estado (completado, pendiente, fallido, reembolsado)</span>
                </li>
                <li className="flex gap-2">
                  <span>💳</span>
                  <span>Filtra por método de pago (stripe, paypal, card, etc.)</span>
                </li>
                <li className="flex gap-2">
                  <span>🔄</span>
                  <span>Solo puedes reembolsar pagos completados</span>
                </li>
                <li className="flex gap-2">
                  <span>📊</span>
                  <span>Las estadísticas se calculan automáticamente según los filtros</span>
                </li>
                <li className="flex gap-2">
                  <span>📥</span>
                  <span>Exporta a CSV para análisis externos</span>
                </li>
              </ul>
            </div>
          </details>
          <button
            onClick={exportToCSV}
            disabled={filteredPayments.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg">📥</span>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-[color:var(--muted-foreground)]">Total</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--foreground)]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-green-600">Completados</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-yellow-600">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-red-600">Fallidos</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-gray-600">Reembolsados</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">{stats.refunded}</p>
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
            placeholder="🔍 Buscar por usuario, email, transaction ID..."
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
            <option value="completed">Completados</option>
            <option value="failed">Fallidos</option>
            <option value="refunded">Reembolsados</option>
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
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">💳</span>
                      <p className="text-sm font-medium text-[color:var(--foreground)]">
                        No hay pagos
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {searchTerm || filterStatus !== 'all' || filterMethod !== 'all'
                          ? 'No se encontraron resultados con los filtros aplicados'
                          : 'Los pagos aparecerán aquí cuando se procesen transacciones'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition-colors hover:bg-[color:var(--muted)]/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[color:var(--foreground)]">
                          {payment.profiles?.full_name || 'Sin nombre'}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {payment.profiles?.email || 'Sin email'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[color:var(--foreground)]">
                          {payment.currency} ${Number(payment.amount).toFixed(2)}
                        </span>
                        {payment.subscriptions?.plans?.name && (
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            Plan: {payment.subscriptions.plans.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[color:var(--foreground)]">
                        {payment.payment_method || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-[color:var(--foreground)]">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetailsModal(true);
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          Ver detalles
                        </button>
                        {payment.status === 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowRefundModal(true);
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                          >
                            Reembolsar
                          </button>
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

      {/* Modal de detalles */}
      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayment(null);
          }}
          onRefund={() => {
            setShowDetailsModal(false);
            setShowRefundModal(true);
          }}
        />
      )}

      {/* Modal de reembolso */}
      {showRefundModal && selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowRefundModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[color:var(--foreground)]">
              🔄 Confirmar Reembolso
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              ¿Estás seguro de que deseas reembolsar este pago?
            </p>

            <div className="mt-4 space-y-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Usuario:</span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  {selectedPayment.profiles?.full_name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Monto:</span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  {selectedPayment.currency} ${Number(selectedPayment.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                <span className="font-mono text-xs text-[color:var(--foreground)]">
                  {selectedPayment.transaction_id || 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Razón del reembolso (opcional)
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Describe por qué se está reembolsando este pago..."
                rows={3}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder-[color:var(--muted-foreground)] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleRefund}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Procesando...' : 'Confirmar Reembolso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentDetailsModal({
  payment,
  onClose,
  onRefund,
}: {
  payment: Payment;
  onClose: () => void;
  onRefund: () => void;
}) {
  const refundInfo = payment.metadata?.refund;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] p-6">
          <h3 className="text-xl font-bold text-[color:var(--foreground)]">
            💳 Detalles del Pago
          </h3>
          <button
            onClick={onClose}
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
                  {payment.profiles?.full_name || 'Sin nombre'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Email:</span>
                <span className="font-medium text-[color:var(--foreground)]">
                  {payment.profiles?.email || 'Sin email'}
                </span>
              </div>
            </div>
          </div>

          {/* Pago */}
          <div className="rounded-lg border border-[color:var(--border)] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
              💰 Información del Pago
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">ID de Pago:</span>
                <span className="font-mono text-xs text-[color:var(--foreground)]">
                  {payment.id}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Monto:</span>
                <span className="text-lg font-bold text-[color:var(--foreground)]">
                  {payment.currency} ${Number(payment.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Estado:</span>
                <span>
                  {payment.status === 'completed' && (
                    <span className="inline-flex items-center rounded-full border border-green-300 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      Completado
                    </span>
                  )}
                  {payment.status === 'pending' && (
                    <span className="inline-flex items-center rounded-full border border-yellow-300 bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                      Pendiente
                    </span>
                  )}
                  {payment.status === 'failed' && (
                    <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                      Fallido
                    </span>
                  )}
                  {payment.status === 'refunded' && (
                    <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                      Reembolsado
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Método:</span>
                <span className="font-medium text-[color:var(--foreground)]">
                  {payment.payment_method || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Transaction ID:</span>
                <span className="font-mono text-xs text-[color:var(--foreground)]">
                  {payment.transaction_id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Fecha:</span>
                <span className="font-medium text-[color:var(--foreground)]">
                  {new Date(payment.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Suscripción */}
          {payment.subscriptions && (
            <div className="rounded-lg border border-[color:var(--border)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                📋 Suscripción Asociada
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">ID:</span>
                  <span className="font-mono text-xs text-[color:var(--foreground)]">
                    {payment.subscription_id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--muted-foreground)]">Plan:</span>
                  <span className="font-medium text-[color:var(--foreground)]">
                    {payment.subscriptions.plans?.name || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Información de reembolso */}
          {refundInfo && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-900/10">
              <h4 className="mb-3 text-sm font-semibold text-red-800 dark:text-red-400">
                🔄 Información del Reembolso
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-red-700 dark:text-red-300">Reembolsado por:</span>
                  <span className="font-medium text-red-900 dark:text-red-200">
                    {refundInfo.refunded_by}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-700 dark:text-red-300">Fecha:</span>
                  <span className="font-medium text-red-900 dark:text-red-200">
                    {new Date(refundInfo.refunded_at).toLocaleString()}
                  </span>
                </div>
                {refundInfo.reason && (
                  <div className="mt-2">
                    <span className="text-sm text-red-700 dark:text-red-300">Razón:</span>
                    <p className="mt-1 text-sm text-red-900 dark:text-red-200">
                      {refundInfo.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {payment.metadata && Object.keys(payment.metadata).filter(k => k !== 'refund').length > 0 && (
            <div className="rounded-lg border border-[color:var(--border)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                📝 Metadata
              </h4>
              <pre className="overflow-x-auto rounded bg-[color:var(--muted)] p-3 text-xs text-[color:var(--foreground)]">
                {JSON.stringify(payment.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[color:var(--border)] p-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
          >
            Cerrar
          </button>
          {payment.status === 'completed' && (
            <button
              onClick={onRefund}
              className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-red-600 hover:to-red-700"
            >
              Reembolsar Pago
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
