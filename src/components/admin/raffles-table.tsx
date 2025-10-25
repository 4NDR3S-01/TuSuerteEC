'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  status: 'draft' | 'active' | 'closed' | 'drawn' | 'completed';
  entry_mode: 'subscribers_only' | 'tickets_only' | 'hybrid';
  total_winners: number;
  max_entries_per_user: number | null;
  is_trending: boolean;
  created_at: string;
  _count?: {
    raffle_entries: number;
  };
};

type RafflesTableProps = {
  initialRaffles: Raffle[];
  totalCount: number;
};

type RaffleFormData = {
  title: string;
  description: string;
  prize_description: string;
  prize_category: string;
  start_date: string;
  end_date: string;
  draw_date: string;
  entry_mode: 'subscribers_only' | 'tickets_only' | 'hybrid';
  total_winners: number;
  max_entries_per_user: number | null;
  is_trending: boolean;
};

const STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
  drawn: 'Sorteado',
  completed: 'Completado',
};

const STATUS_COLORS = {
  draft: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  closed: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  drawn: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  completed: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
};

const ENTRY_MODE_LABELS = {
  subscribers_only: 'Solo Suscriptores',
  tickets_only: 'Solo Boletos',
  hybrid: 'Híbrido',
};

const CATEGORY_ICONS = {
  electronics: '📱',
  vehicles: '🚗',
  travel: '✈️',
  cash: '💵',
  home: '🏠',
  entertainment: '🎮',
  sports: '⚽',
  other: '🎁',
};

const CATEGORY_LABELS = {
  electronics: 'Electrónicos',
  vehicles: 'Vehículos',
  travel: 'Viajes',
  cash: 'Efectivo',
  home: 'Hogar',
  entertainment: 'Entretenimiento',
  sports: 'Deportes',
  other: 'Otros',
};

export function RafflesTable({ initialRaffles, totalCount }: RafflesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [raffles, setRaffles] = useState<Raffle[]>(initialRaffles);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Detectar parámetro ?crear=true y abrir modal automáticamente
  useEffect(() => {
    if (searchParams.get('crear') === 'true') {
      setShowCreateModal(true);
      // Limpiar el parámetro de la URL
      router.replace('/administrador/sorteos', { scroll: false });
    }
  }, [searchParams, router]);

  const filteredRaffles = raffles.filter((raffle) => {
    const matchesSearch = raffle.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || raffle.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || raffle.prize_category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateRaffle = () => {
    setSelectedRaffle(null);
    setShowCreateModal(true);
  };

  const handleEditRaffle = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setShowEditModal(true);
  };

  const handleDuplicateRaffle = async (raffle: Raffle) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('raffles')
      .insert({
        title: `${raffle.title} (Copia)`,
        description: raffle.description,
        prize_description: raffle.prize_description,
        prize_category: raffle.prize_category || 'other',
        image_url: raffle.image_url,
        start_date: new Date().toISOString(),
        end_date: raffle.end_date,
        draw_date: raffle.draw_date,
        status: 'draft',
        entry_mode: raffle.entry_mode,
        total_winners: raffle.total_winners,
        max_entries_per_user: raffle.max_entries_per_user,
      });

    if (error) {
      console.error('Error duplicating raffle:', error);
      alert('Error al duplicar el sorteo');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleDeleteRaffle = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedRaffle) return;

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('raffles')
      .delete()
      .eq('id', selectedRaffle.id);

    if (error) {
      console.error('Error deleting raffle:', error);
      alert('Error al eliminar el sorteo');
    } else {
      setRaffles(raffles.filter((r) => r.id !== selectedRaffle.id));
      setShowDeleteModal(false);
      setSelectedRaffle(null);
    }

    setIsLoading(false);
  };

  const handleChangeStatus = async (raffle: Raffle, newStatus: Raffle['status']) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('raffles')
      .update({ status: newStatus })
      .eq('id', raffle.id);

    if (error) {
      console.error('Error updating status:', error);
      alert('Error al cambiar el estado');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--foreground)]">Gestión de Sorteos</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {totalCount} sorteos en total
          </p>
        </div>
        <button
          onClick={handleCreateRaffle}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <span>✨</span>
          Crear nuevo sorteo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
          />
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] sm:w-52"
          >
            <option value="all">Todas las categorías</option>
            <option value="electronics">📱 Electrónicos</option>
            <option value="vehicles">🚗 Vehículos</option>
            <option value="travel">✈️ Viajes</option>
            <option value="cash">💵 Efectivo</option>
            <option value="home">🏠 Hogar</option>
            <option value="entertainment">🎮 Entretenimiento</option>
            <option value="sports">⚽ Deportes</option>
            <option value="other">🎁 Otros</option>
          </select>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] sm:w-48"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="closed">Cerrado</option>
            <option value="drawn">Sorteado</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Sorteo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Modalidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Fechas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Participantes
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {filteredRaffles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🎁</span>
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">
                        No hay sorteos
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No se encontraron sorteos con los filtros aplicados'
                          : 'Crea tu primer sorteo para comenzar'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRaffles.map((raffle) => (
                  <tr key={raffle.id} className="hover:bg-[color:var(--muted)]/20">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {raffle.image_url ? (
                          <img
                            src={raffle.image_url}
                            alt={raffle.prize_description}
                            className="h-12 w-12 rounded-lg border border-[color:var(--border)] object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20">
                            <span className="text-xl">
                              {CATEGORY_ICONS[raffle.prize_category as keyof typeof CATEGORY_ICONS] || '🎁'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">
                              {raffle.title}
                            </p>
                            {raffle.is_trending && (
                              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                🔥 Tendencia
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-[color:var(--muted-foreground)]">
                              {raffle.prize_description || 'Sin premio especificado'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-[color:var(--muted)]/40 px-2 py-0.5 text-xs font-semibold text-[color:var(--muted-foreground)]">
                              {CATEGORY_LABELS[raffle.prize_category as keyof typeof CATEGORY_LABELS] || 'Otros'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_COLORS[raffle.status]
                        }`}
                      >
                        {STATUS_LABELS[raffle.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-[color:var(--foreground)]">
                        {ENTRY_MODE_LABELS[raffle.entry_mode]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-[color:var(--muted-foreground)]">
                        <p>Inicio: {new Date(raffle.start_date).toLocaleDateString('es-EC')}</p>
                        <p>Fin: {new Date(raffle.end_date).toLocaleDateString('es-EC')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {raffle._count?.raffle_entries || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {raffle.status === 'draft' && (
                          <button
                            onClick={() => handleChangeStatus(raffle, 'active')}
                            disabled={isLoading}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                            title="Activar sorteo"
                          >
                            ▶ Activar
                          </button>
                        )}
                        {raffle.status === 'active' && (
                          <button
                            onClick={() => handleChangeStatus(raffle, 'closed')}
                            disabled={isLoading}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
                            title="Cerrar sorteo"
                          >
                            ⏸ Cerrar
                          </button>
                        )}
                        {raffle.status === 'closed' && (
                          <button
                            onClick={() => router.push(`/sorteo/${raffle.id}/ejecutar`)}
                            disabled={isLoading}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
                            title="Ejecutar sorteo"
                          >
                            🎲 Sortear
                          </button>
                        )}
                        <button
                          onClick={() => handleEditRaffle(raffle)}
                          className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDuplicateRaffle(raffle)}
                          disabled={isLoading}
                          className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
                          title="Duplicar"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => handleDeleteRaffle(raffle)}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                          title="Eliminar"
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
        <RaffleFormModal
          raffle={selectedRaffle}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedRaffle(null);
          }}
          onSuccess={() => {
            router.refresh();
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedRaffle(null);
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedRaffle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedRaffle(null);
          }}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-[color:var(--foreground)]">
                  Eliminar sorteo
                </h3>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  ¿Estás seguro de que deseas eliminar <strong>{selectedRaffle.title}</strong>?
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRaffle(null);
                }}
                className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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

// Modal Form Component
function RaffleFormModal({
  raffle,
  onClose,
  onSuccess,
}: {
  raffle: Raffle | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [prizeImage, setPrizeImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<RaffleFormData>({
    title: raffle?.title || '',
    description: raffle?.description || '',
    prize_description: raffle?.prize_description || '',
    prize_category: raffle?.prize_category || 'other',
    start_date: raffle?.start_date ? new Date(raffle.start_date).toISOString().split('T')[0] : '',
    end_date: raffle?.end_date ? new Date(raffle.end_date).toISOString().split('T')[0] : '',
    draw_date: raffle?.draw_date ? new Date(raffle.draw_date).toISOString().split('T')[0] : '',
    entry_mode: raffle?.entry_mode || 'subscribers_only',
    total_winners: raffle?.total_winners || 1,
    max_entries_per_user: raffle?.max_entries_per_user || null,
    is_trending: raffle?.is_trending || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    let imageUrl = raffle?.image_url || null;

    try {
      // Subir imagen si se seleccionó una
      if (prizeImage) {
        setUploadingImage(true);
        const fileExt = prizeImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('raffle-prizes')
          .upload(fileName, prizeImage, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Error al subir la imagen: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('raffle-prizes')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        setUploadingImage(false);
      }

      const payload = {
        ...formData,
        image_url: imageUrl,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        draw_date: formData.draw_date ? new Date(formData.draw_date).toISOString() : null,
      };

      if (raffle) {
        // Update existing raffle
        const { error } = await supabase
          .from('raffles')
          .update(payload)
          .eq('id', raffle.id);

        if (error) {
          throw new Error('Error al actualizar el sorteo');
        }
      } else {
        // Create new raffle
        const { error } = await supabase
          .from('raffles')
          .insert({ ...payload, status: 'draft' });

        if (error) {
          throw new Error('Error al crear el sorteo');
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar el sorteo');
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[color:var(--foreground)]">
            {raffle ? '✏️ Editar sorteo' : '✨ Crear nuevo sorteo'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Título del sorteo *
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={100}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Ej: Gran Sorteo de Fin de Año"
            />
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              {formData.title.length}/100 caracteres (mínimo 5)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Describe el sorteo..."
            />
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              {formData.description.length}/500 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Premio *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={150}
              value={formData.prize_description}
              onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Ej: iPhone 15 Pro Max"
            />
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              {formData.prize_description.length}/150 caracteres (mínimo 3)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Categoría del Premio *
            </label>
            <select
              required
              value={formData.prize_category}
              onChange={(e) => setFormData({ ...formData, prize_category: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
            >
              <option value="electronics">📱 Electrónicos</option>
              <option value="vehicles">🚗 Vehículos</option>
              <option value="travel">✈️ Viajes</option>
              <option value="cash">💵 Efectivo</option>
              <option value="home">🏠 Hogar</option>
              <option value="entertainment">🎮 Entretenimiento</option>
              <option value="sports">⚽ Deportes</option>
              <option value="other">🎁 Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Imagen del Premio
            </label>
            
            {/* Preview de imagen actual o nueva */}
            <div className="mb-3">
              {prizeImage ? (
                <div className="relative inline-block">
                  <img 
                    src={URL.createObjectURL(prizeImage)} 
                    alt="Preview del premio" 
                    className="h-32 w-32 rounded-lg border-2 border-[color:var(--accent)] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPrizeImage(null)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg hover:bg-red-600"
                  >
                    ✕
                  </button>
                  <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                    📸 {prizeImage.name}
                  </p>
                </div>
              ) : raffle?.image_url ? (
                <div className="relative inline-block">
                  <img 
                    src={raffle.image_url} 
                    alt="Imagen actual del premio" 
                    className="h-32 w-32 rounded-lg border border-[color:var(--border)] object-cover"
                  />
                  <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                    Imagen actual
                  </p>
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/20">
                  <span className="text-4xl opacity-50">📸</span>
                </div>
              )}
            </div>

            {/* Input de archivo estilizado */}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40">
              <span>📁</span>
              <span>{prizeImage ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validar tamaño (máx 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      alert('La imagen es muy grande. Máximo 5MB permitido.');
                      e.target.value = '';
                      return;
                    }
                    // Validar tipo
                    if (!file.type.startsWith('image/')) {
                      alert('Solo se permiten archivos de imagen.');
                      e.target.value = '';
                      return;
                    }
                    setPrizeImage(file);
                  }
                }}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
              Formatos: JPG, PNG, WEBP • Máximo 5MB
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
                Fecha inicio *
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
                Fecha fin *
              </label>
              <input
                type="date"
                required
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
              {formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date) && (
                <p className="mt-1 text-xs text-red-500">La fecha fin debe ser posterior a la fecha inicio</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
                Fecha sorteo *
              </label>
              <input
                type="date"
                required
                min={formData.end_date || formData.start_date || new Date().toISOString().split('T')[0]}
                value={formData.draw_date}
                onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
              {formData.end_date && formData.draw_date && new Date(formData.draw_date) < new Date(formData.end_date) && (
                <p className="mt-1 text-xs text-red-500">La fecha del sorteo debe ser posterior a la fecha fin</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
                Modalidad *
              </label>
              <select
                required
                value={formData.entry_mode}
                onChange={(e) => setFormData({ ...formData, entry_mode: e.target.value as any })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="subscribers_only">Solo Suscriptores</option>
                <option value="tickets_only">Solo Boletos</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
                Nº ganadores *
              </label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={formData.total_winners}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value);
                  if (val >= 1 && val <= 100) {
                    setFormData({ ...formData, total_winners: val });
                  }
                }}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Mínimo: 1 • Máximo: 100
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
                Máx. por usuario
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.max_entries_per_user || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number.parseInt(e.target.value) : null;
                  if (val === null || (val >= 1 && val <= 50)) {
                    setFormData({ ...formData, max_entries_per_user: val });
                  }
                }}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                placeholder="Ilimitado"
              />
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Dejar vacío para ilimitado
              </p>
            </div>
          </div>

          {/* Toggle En Tendencia */}
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
            <div>
              <label className="text-sm font-semibold text-[color:var(--foreground)]">
                🔥 En tendencia
              </label>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Destacar este sorteo en la página principal
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_trending: !formData.is_trending })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_trending ? 'bg-[color:var(--accent)]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_trending ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || uploadingImage}
              className="flex-1 rounded-lg bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:bg-[color:var(--accent)]/90 disabled:opacity-50"
            >
              {uploadingImage ? 'Subiendo imagen...' : isLoading ? 'Guardando...' : raffle ? 'Actualizar' : 'Crear sorteo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
