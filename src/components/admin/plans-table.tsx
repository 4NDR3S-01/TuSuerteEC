'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripe_price_id: string | null;
  benefits: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  max_concurrent_raffles: number | null;
  show_raffles_limit: boolean;
  raffles_limit_message: string | null;
  created_at: string;
  updated_at: string;
};

type PlansTableProps = {
  initialPlans: Plan[];
};

type PlanFormData = {
  name: string;
  description: string;
  price: string;
  currency: string;
  interval: 'month' | 'year';
  benefits: string;
  max_concurrent_raffles: string;
  show_raffles_limit: boolean;
  raffles_limit_message: string;
  is_active: boolean;
};

const INTERVAL_LABELS = {
  month: 'Mensual',
  year: 'Anual',
};

export function PlansTable({ initialPlans }: Readonly<PlansTableProps>) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [searchQuery, setSearchQuery] = useState('');
  const [intervalFilter, setIntervalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = plan.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInterval = intervalFilter === 'all' || plan.interval === intervalFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && plan.is_active) || 
      (statusFilter === 'inactive' && !plan.is_active);
    return matchesSearch && matchesInterval && matchesStatus;
  });

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setShowCreateModal(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleDeletePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', selectedPlan.id);

    if (error) {
      console.error('Error deleting plan:', error);
      alert('Error al eliminar el plan');
    } else {
      setShowDeleteModal(false);
      setSelectedPlan(null);
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleToggleStatus = async (plan: Plan) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('plans')
      .update({ 
        is_active: !plan.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id);

    if (error) {
      console.error('Error updating plan status:', error);
      alert('Error al cambiar el estado del plan');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleToggleFeatured = async (plan: Plan) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Si vamos a marcar como destacado, primero quitamos el destacado de todos los demás
    if (!plan.is_featured) {
      await supabase
        .from('plans')
        .update({ is_featured: false })
        .neq('id', plan.id);
    }

    // Luego toggle el plan seleccionado
    const { error } = await supabase
      .from('plans')
      .update({ 
        is_featured: !plan.is_featured,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id);

    if (error) {
      console.error('Error updating featured status:', error);
      alert('Error al cambiar el estado de destacado');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleDuplicatePlan = async (plan: Plan) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('plans')
      .insert({
        name: `${plan.name} (Copia)`,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        benefits: plan.benefits,
        max_concurrent_raffles: plan.max_concurrent_raffles,
        is_active: false, // Por defecto inactivo
      });

    if (error) {
      console.error('Error duplicating plan:', error);
      alert('Error al duplicar el plan');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency;
    return `${symbol}${price.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--foreground)]">Planes de Suscripción</h1>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Gestiona los planes disponibles para los usuarios
            </p>
          </div>
          <button
            onClick={handleCreatePlan}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:opacity-90"
          >
            <span className="text-lg">➕</span>
            Crear Plan
          </button>
        </div>

        {/* Panel de ayuda */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-600 dark:text-purple-400">Consejos para planes</h3>
              <ul className="mt-2 space-y-1 text-sm text-purple-600/90 dark:text-purple-400/90">
                <li>• <strong>Beneficios:</strong> Escribe uno por línea para listarlos automáticamente</li>
                <li>• <strong>Precio:</strong> Define precios competitivos según el intervalo (mensual/anual)</li>
                <li>• <strong>Sorteos simultáneos:</strong> Limita cuántos sorteos puede tener activos un usuario</li>
                <li>• <strong>🎯 Mensaje destacado:</strong> Personaliza el badge azul - usa {'{limit}'} como placeholder para el número</li>
                <li>• <strong>Estado:</strong> Solo los planes activos se muestran públicamente</li>
                <li>• <strong>⭐ Popular:</strong> Marca UN plan como destacado - aparecerá resaltado en la página principal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
              🔍 Buscar
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
              📅 Intervalo
            </label>
            <select
              value={intervalFilter}
              onChange={(e) => setIntervalFilter(e.target.value)}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            >
              <option value="all">Todos</option>
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
              📊 Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
          <span>📦 Mostrando {filteredPlans.length} de {plans.length} planes</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Precio
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Intervalo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Sorteos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  <span className="group relative cursor-help">
                    Popular
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Solo 1 plan puede ser destacado
                    </span>
                  </span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                    {searchQuery || intervalFilter !== 'all' || statusFilter !== 'all'
                      ? 'No se encontraron planes con los filtros aplicados'
                      : 'No hay planes creados. Crea tu primer plan.'}
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="transition-colors hover:bg-[color:var(--muted)]/30">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">{plan.name}</p>
                        {plan.description && (
                          <p className="mt-1 text-sm text-[color:var(--muted-foreground)] line-clamp-1">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-lg font-bold text-[color:var(--foreground)]">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {plan.interval === 'month' ? '📅' : '📆'} {INTERVAL_LABELS[plan.interval]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-[color:var(--foreground)]">
                        {plan.max_concurrent_raffles ? `${plan.max_concurrent_raffles} máx.` : 'Ilimitado'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleStatus(plan)}
                        disabled={isLoading}
                        className="group relative"
                      >
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${
                          plan.is_active
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
                        }`}>
                          {plan.is_active ? '✅ Activo' : '⏸️ Inactivo'}
                        </span>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Click para {plan.is_active ? 'desactivar' : 'activar'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleToggleFeatured(plan)}
                          disabled={isLoading || !plan.is_active}
                          className="group relative"
                        >
                          {plan.is_featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                              ⭐ Popular
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-gray-400 px-3 py-1 text-xs font-semibold text-gray-500 transition-all hover:border-orange-500 hover:text-orange-600 disabled:opacity-50">
                              ☆ Marcar
                            </span>
                          )}
                          {!plan.is_active && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                              Activa el plan primero
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditPlan(plan)}
                          disabled={isLoading}
                          className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--foreground)] transition-all hover:bg-[color:var(--muted)]/40 hover:scale-110 disabled:opacity-50"
                          title="✏️ Editar plan"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDuplicatePlan(plan)}
                          disabled={isLoading}
                          className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--foreground)] transition-all hover:bg-[color:var(--muted)]/40 hover:scale-110 disabled:opacity-50"
                          title="📋 Duplicar plan"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan)}
                          disabled={isLoading}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-600 transition-all hover:bg-red-500/20 hover:scale-110 dark:text-red-400 disabled:opacity-50"
                          title="🗑️ Eliminar plan"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <PlanFormModal
          plan={selectedPlan}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedPlan(null);
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPlan && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[color:var(--foreground)] mb-2">
              ¿Eliminar plan?
            </h3>
            <p className="text-sm text-[color:var(--muted-foreground)] mb-6">
              ¿Estás seguro de que deseas eliminar el plan "{selectedPlan.name}"? Los usuarios con suscripciones activas podrían verse afectados.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isLoading}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de Formulario
function PlanFormModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price?.toString() || '',
    currency: plan?.currency || 'USD',
    interval: plan?.interval || 'month',
    benefits: plan?.benefits?.join('\n') || '',
    max_concurrent_raffles: plan?.max_concurrent_raffles?.toString() || '',
    show_raffles_limit: plan?.show_raffles_limit ?? true,
    raffles_limit_message: plan?.raffles_limit_message || '',
    is_active: plan?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    const benefitsArray = formData.benefits
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const planData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      currency: formData.currency,
      interval: formData.interval,
      benefits: benefitsArray.length > 0 ? benefitsArray : null,
      max_concurrent_raffles: formData.max_concurrent_raffles ? parseInt(formData.max_concurrent_raffles) : null,
      show_raffles_limit: formData.show_raffles_limit,
      raffles_limit_message: formData.raffles_limit_message || null,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    };

    if (plan) {
      // Actualizar
      const { error } = await supabase
        .from('plans')
        .update(planData)
        .eq('id', plan.id);

      if (error) {
        console.error('Error updating plan:', error);
        alert('Error al actualizar el plan');
      } else {
        onSuccess();
      }
    } else {
      // Crear
      const { error } = await supabase
        .from('plans')
        .insert(planData);

      if (error) {
        console.error('Error creating plan:', error);
        alert('Error al crear el plan');
      } else {
        onSuccess();
      }
    }

    setIsLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl my-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[color:var(--border)] p-6">
          <h2 className="text-2xl font-bold text-[color:var(--foreground)]">
            {plan ? '✏️ Editar Plan' : '➕ Crear Nuevo Plan'}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {plan ? 'Modifica los detalles del plan' : 'Define los beneficios y precio del nuevo plan'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Nombre del Plan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Plan Básico, Plan Premium..."
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe brevemente el plan..."
                rows={2}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Precio <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="9.99"
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Moneda <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              >
                <option value="USD">USD - Dólar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Peso Mexicano</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Intervalo <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value as 'month' | 'year' })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              >
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Sorteos Simultáneos
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_concurrent_raffles}
                onChange={(e) => setFormData({ ...formData, max_concurrent_raffles: e.target.value })}
                placeholder="Dejar vacío = Ilimitado"
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_raffles_limit}
                  onChange={(e) => setFormData({ ...formData, show_raffles_limit: e.target.checked })}
                  className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)]"
                />
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  🎯 Mostrar mensaje destacado
                </span>
              </label>
              <span className="ml-2 text-xs text-[color:var(--muted-foreground)]">
                (Badge azul personalizable)
              </span>
            </div>

            {formData.show_raffles_limit && (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                  Mensaje del Badge (opcional)
                </label>
                <input
                  type="text"
                  value={formData.raffles_limit_message}
                  onChange={(e) => setFormData({ ...formData, raffles_limit_message: e.target.value })}
                  placeholder="Ej: Hasta {limit} sorteos activos, Participa en {limit} sorteos a la vez"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                />
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  💡 Usa <code className="rounded bg-[color:var(--muted)] px-1">{'{limit}'}</code> para mostrar el número de sorteos. 
                  Si está vacío, se mostrará: "🎯 Hasta {'{limit}'} sorteos simultáneos"
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Beneficios (uno por línea)
              </label>
              <textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Acceso a todos los sorteos&#10;Soporte prioritario&#10;Sin comisiones&#10;Estadísticas detalladas"
                rows={6}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] font-mono"
              />
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Escribe cada beneficio en una línea nueva
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)]"
                />
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  Plan activo (visible públicamente)
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : plan ? 'Actualizar' : 'Crear Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
