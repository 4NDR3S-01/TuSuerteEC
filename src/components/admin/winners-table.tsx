'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

type Winner = {
  id: string;
  prize_position: number | null;
  status: string;
  contact_attempts: number | null;
  contacted_at: string | null;
  delivered_at: string | null;
  delivery_photo_url: string | null;
  notes: string | null;
  testimonial: string | null;
  created_at: string;
  raffle_id: string;
  raffles: {
    id: string;
    title: string;
    draw_date: string | null;
  } | null;
  user_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
  } | null;
};

type WinnersTableProps = {
  winners: Winner[];
};

export function WinnersTable({ winners: initialWinners }: WinnersTableProps) {
  const [winners, setWinners] = useState(initialWinners);
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = getSupabaseBrowserClient();

  // Filtrar ganadores
  const filteredWinners = winners.filter((winner) => {
    const matchesStatus = filterStatus === 'all' || winner.status === filterStatus;
    const matchesSearch =
      winner.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      winner.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      winner.raffles?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: filteredWinners.length,
    pending: filteredWinners.filter((w) => w.status === 'pending_contact').length,
    contacted: filteredWinners.filter((w) => w.status === 'contacted').length,
    delivered: filteredWinners.filter((w) => w.status === 'prize_delivered').length,
    rejected: filteredWinners.filter((w) => w.status === 'rejected').length,
    withTestimonials: filteredWinners.filter((w) => w.testimonial).length,
  };

  const exportToCSV = () => {
    const headers = [
      'Ganador',
      'Email',
      'Teléfono',
      'Sorteo',
      'Posición',
      'Estado',
      'Intentos de contacto',
      'Fecha de contacto',
      'Fecha de entrega',
      'Testimonio',
      'Notas',
    ];

    const rows = filteredWinners.map((winner) => [
      winner.profiles?.full_name || 'N/A',
      winner.profiles?.email || 'N/A',
      winner.profiles?.phone_number || 'N/A',
      winner.raffles?.title || 'N/A',
      winner.prize_position || 1,
      getStatusLabel(winner.status),
      winner.contact_attempts || 0,
      winner.contacted_at ? new Date(winner.contacted_at).toLocaleString() : 'N/A',
      winner.delivered_at ? new Date(winner.delivered_at).toLocaleString() : 'N/A',
      winner.testimonial || 'N/A',
      winner.notes || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ganadores-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast({
      type: 'success',
      description: 'Ganadores exportados exitosamente.',
    });
  };

  const handleMarkAsContacted = async () => {
    if (!selectedWinner) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('winners')
        .update({
          status: 'contacted',
          contacted_at: new Date().toISOString(),
          contact_attempts: (selectedWinner.contact_attempts || 0) + 1,
          notes: notes || selectedWinner.notes,
        })
        .eq('id', selectedWinner.id);

      if (error) throw error;

      setWinners(
        winners.map((w) =>
          w.id === selectedWinner.id
            ? {
                ...w,
                status: 'contacted',
                contacted_at: new Date().toISOString(),
                contact_attempts: (w.contact_attempts || 0) + 1,
                notes: notes || w.notes,
              }
            : w
        )
      );

      showToast({
        type: 'success',
        description: 'Ganador marcado como contactado exitosamente.',
      });

      setShowContactModal(false);
      setSelectedWinner(null);
      setNotes('');
      router.refresh();
    } catch (error) {
      console.error('Error marking as contacted:', error);
      showToast({
        type: 'error',
        description: 'No se pudo actualizar el estado. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!selectedWinner) return;

    setIsLoading(true);
    try {
      let photoUrl = null;

      // Subir foto si se seleccionó una
      if (deliveryPhoto) {
        setUploadingPhoto(true);
        const fileExt = deliveryPhoto.name.split('.').pop();
        const fileName = `${selectedWinner.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('winners-photos')
          .upload(filePath, deliveryPhoto, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Error al subir la foto: ' + uploadError.message);
        }

        // Obtener URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from('winners-photos').getPublicUrl(filePath);

        photoUrl = publicUrl;
        setUploadingPhoto(false);
      }

      // Actualizar ganador
      const { error } = await supabase
        .from('winners')
        .update({
          status: 'prize_delivered',
          delivered_at: new Date().toISOString(),
          notes: notes || selectedWinner.notes,
          delivery_photo_url: photoUrl,
        })
        .eq('id', selectedWinner.id);

      if (error) throw error;

      setWinners(
        winners.map((w) =>
          w.id === selectedWinner.id
            ? {
                ...w,
                status: 'prize_delivered',
                delivered_at: new Date().toISOString(),
                notes: notes || w.notes,
                delivery_photo_url: photoUrl,
              }
            : w
        )
      );

      showToast({
        type: 'success',
        description: 'Premio marcado como entregado exitosamente.',
      });

      setShowDeliveredModal(false);
      setSelectedWinner(null);
      setNotes('');
      setDeliveryPhoto(null);
      router.refresh();
    } catch (error) {
      console.error('Error marking as delivered:', error);
      showToast({
        type: 'error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el estado. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
      setUploadingPhoto(false);
    }
  };

  const handleAddTestimonial = async () => {
    if (!selectedWinner || !testimonial.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('winners')
        .update({ testimonial: testimonial.trim() })
        .eq('id', selectedWinner.id);

      if (error) throw error;

      setWinners(
        winners.map((w) => (w.id === selectedWinner.id ? { ...w, testimonial: testimonial.trim() } : w))
      );

      showToast({
        type: 'success',
        description: 'Testimonio agregado exitosamente.',
      });

      setShowTestimonialModal(false);
      setSelectedWinner(null);
      setTestimonial('');
      router.refresh();
    } catch (error) {
      console.error('Error adding testimonial:', error);
      showToast({
        type: 'error',
        description: 'No se pudo agregar el testimonio. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'prize_delivered':
        return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'contacted':
        return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'pending_contact':
        return 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_contact: 'Pendiente',
      contacted: 'Contactado',
      prize_delivered: 'Entregado',
      rejected: 'Rechazado',
    };
    return labels[status] || status;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[color:var(--foreground)]">🏆 Ganadores</h1>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Gestiona el flujo completo de contacto, entrega y testimonios
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
                    <span>📞</span>
                    <span>Marca como "Contactado" cuando te comuniques con el ganador</span>
                  </li>
                  <li className="flex gap-2">
                    <span>📦</span>
                    <span>Marca como "Entregado" una vez que el premio llegue al ganador</span>
                  </li>
                  <li className="flex gap-2">
                    <span>💬</span>
                    <span>Solicita testimonios después de entregar el premio</span>
                  </li>
                  <li className="flex gap-2">
                    <span>📝</span>
                    <span>Usa las notas para registrar detalles importantes</span>
                  </li>
                  <li className="flex gap-2">
                    <span>🔍</span>
                    <span>Busca por nombre, email o título del sorteo</span>
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
              disabled={filteredWinners.length === 0}
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
            <p className="text-sm text-amber-600">Pendientes</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <p className="text-sm text-blue-600">Contactados</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.contacted}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <p className="text-sm text-emerald-600">Entregados</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.delivered}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <p className="text-sm text-red-600">Rechazados</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <p className="text-sm text-purple-600">Con testimonios</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">{stats.withTestimonials}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Buscar por ganador, email o sorteo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder-[color:var(--muted-foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos los estados</option>
            <option value="pending_contact">Pendientes</option>
            <option value="contacted">Contactados</option>
            <option value="prize_delivered">Entregados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                    Ganador
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                    Sorteo
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                    Premio
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground)]">
                    Contactos
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[color:var(--foreground)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filteredWinners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">🏆</span>
                        <p className="text-sm font-medium text-[color:var(--foreground)]">
                          No hay ganadores
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {searchTerm || filterStatus !== 'all'
                            ? 'No se encontraron resultados con los filtros aplicados'
                            : 'Los ganadores aparecerán aquí cuando se realicen sorteos'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWinners.map((winner) => (
                    <tr key={winner.id} className="transition-colors hover:bg-[color:var(--muted)]/20">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-[color:var(--foreground)]">
                            {winner.profiles?.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-[color:var(--muted-foreground)]">
                            {winner.profiles?.email || 'Sin correo'}
                          </div>
                          {winner.profiles?.phone_number && (
                            <div className="text-xs text-[color:var(--muted-foreground)]">
                              📞 {winner.profiles.phone_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[color:var(--foreground)]">
                          {winner.raffles?.title || 'Sorteo desconocido'}
                        </div>
                        {winner.raffles?.draw_date && (
                          <div className="text-xs text-[color:var(--muted-foreground)]">
                            {new Date(winner.raffles.draw_date).toLocaleDateString('es-EC')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[color:var(--muted-foreground)]">
                        Posición {winner.prize_position || 1}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(winner.status)}`}>
                          {getStatusLabel(winner.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--muted-foreground)]">
                        {winner.contact_attempts || 0} intentos
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedWinner(winner);
                              setShowDetailsModal(true);
                            }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                          >
                            Ver detalles
                          </button>
                          {winner.status === 'pending_contact' && (
                            <button
                              onClick={() => {
                                setSelectedWinner(winner);
                                setShowContactModal(true);
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                            >
                              Contactar
                            </button>
                          )}
                          {(winner.status === 'contacted' || winner.status === 'pending_contact') && (
                            <button
                              onClick={() => {
                                setSelectedWinner(winner);
                                setShowDeliveredModal(true);
                              }}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
                            >
                              Marcar entregado
                            </button>
                          )}
                          {winner.status === 'prize_delivered' && !winner.testimonial && (
                            <button
                              onClick={() => {
                                setSelectedWinner(winner);
                                setShowTestimonialModal(true);
                              }}
                              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-100"
                            >
                              Solicitar testimonio
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
      </div>

      {/* Modal: Marcar como contactado */}
      {showContactModal && selectedWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[color:var(--foreground)]">Marcar como contactado</h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Ganador: <span className="font-semibold text-[color:var(--foreground)]">{selectedWinner.profiles?.full_name}</span>
            </p>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-[color:var(--foreground)]">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles del contacto..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedWinner(null);
                  setNotes('');
                }}
                disabled={isLoading}
                className="flex-1 rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkAsContacted}
                disabled={isLoading}
                className="flex-1 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Confirmar contacto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Marcar como entregado */}
      {showDeliveredModal && selectedWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[color:var(--foreground)]">Marcar premio como entregado</h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Confirma que el premio fue entregado a{' '}
              <span className="font-semibold text-[color:var(--foreground)]">{selectedWinner.profiles?.full_name}</span>
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[color:var(--foreground)]">
                  Foto de entrega (opcional)
                </label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-[color:var(--foreground)] file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-600 hover:file:bg-blue-100"
                  />
                  {deliveryPhoto && (
                    <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                      📸 {deliveryPhoto.name}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[color:var(--foreground)]">Notas de entrega (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles de la entrega..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeliveredModal(false);
                  setSelectedWinner(null);
                  setNotes('');
                  setDeliveryPhoto(null);
                }}
                disabled={isLoading}
                className="flex-1 rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkAsDelivered}
                disabled={isLoading || uploadingPhoto}
                className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {uploadingPhoto ? 'Subiendo foto...' : isLoading ? 'Guardando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar testimonio */}
      {showTestimonialModal && selectedWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[color:var(--foreground)]">Agregar testimonio</h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Registra el testimonio de{' '}
              <span className="font-semibold text-[color:var(--foreground)]">{selectedWinner.profiles?.full_name}</span>
            </p>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-[color:var(--foreground)]">Testimonio *</label>
              <textarea
                value={testimonial}
                onChange={(e) => setTestimonial(e.target.value)}
                placeholder="Escribe el testimonio del ganador..."
                rows={4}
                required
                className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowTestimonialModal(false);
                  setSelectedWinner(null);
                  setTestimonial('');
                }}
                disabled={isLoading}
                className="flex-1 rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTestimonial}
                disabled={isLoading || !testimonial.trim()}
                className="flex-1 rounded-full bg-purple-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Guardar testimonio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalles completos */}
      {showDetailsModal && selectedWinner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="w-full max-w-2xl my-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--border)] p-6">
              <h3 className="text-xl font-bold text-[color:var(--foreground)]">
                🏆 Detalles del Ganador
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Información del ganador */}
              <div className="rounded-lg border border-[color:var(--border)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  👤 Información del Ganador
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Nombre:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedWinner.profiles?.full_name || 'Sin nombre'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Email:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedWinner.profiles?.email || 'Sin email'}
                    </span>
                  </div>
                  {selectedWinner.profiles?.phone_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Teléfono:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {selectedWinner.profiles.phone_number}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del sorteo */}
              <div className="rounded-lg border border-[color:var(--border)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  🎁 Información del Sorteo
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Sorteo:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedWinner.raffles?.title || 'Sorteo desconocido'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Posición del premio:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedWinner.prize_position || 1}
                    </span>
                  </div>
                  {selectedWinner.raffles?.draw_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Fecha del sorteo:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {new Date(selectedWinner.raffles.draw_date).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado y seguimiento */}
              <div className="rounded-lg border border-[color:var(--border)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  📊 Estado y Seguimiento
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Estado actual:</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(selectedWinner.status)}`}>
                      {getStatusLabel(selectedWinner.status)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Intentos de contacto:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {selectedWinner.contact_attempts || 0}
                    </span>
                  </div>
                  {selectedWinner.contacted_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Contactado el:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {new Date(selectedWinner.contacted_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedWinner.delivered_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--muted-foreground)]">Entregado el:</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {new Date(selectedWinner.delivered_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--muted-foreground)]">Registrado el:</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {new Date(selectedWinner.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {selectedWinner.notes && (
                <div className="rounded-lg border border-[color:var(--border)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    📝 Notas
                  </h4>
                  <p className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap">
                    {selectedWinner.notes}
                  </p>
                </div>
              )}

              {/* Foto de entrega */}
              {selectedWinner.delivery_photo_url && (
                <div className="rounded-lg border border-[color:var(--border)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                    📸 Foto de Entrega
                  </h4>
                  <img
                    src={selectedWinner.delivery_photo_url}
                    alt="Foto de entrega del premio"
                    className="w-full rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Testimonio */}
              {selectedWinner.testimonial && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:bg-purple-900/10 dark:border-purple-800">
                  <h4 className="mb-3 text-sm font-semibold text-purple-800 dark:text-purple-400">
                    💬 Testimonio
                  </h4>
                  <p className="text-sm text-purple-900 dark:text-purple-200 whitespace-pre-wrap">
                    {selectedWinner.testimonial}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--border)] p-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
              >
                Cerrar
              </button>
              {selectedWinner.status === 'pending_contact' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowContactModal(true);
                  }}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-700"
                >
                  Marcar como contactado
                </button>
              )}
              {(selectedWinner.status === 'contacted' || selectedWinner.status === 'pending_contact') && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowDeliveredModal(true);
                  }}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-emerald-600 hover:to-emerald-700"
                >
                  Marcar como entregado
                </button>
              )}
              {selectedWinner.status === 'prize_delivered' && !selectedWinner.testimonial && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowTestimonialModal(true);
                  }}
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-purple-600 hover:to-purple-700"
                >
                  Agregar testimonio
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
