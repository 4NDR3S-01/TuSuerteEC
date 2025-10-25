'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

type LiveEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  countdown_start_at: string | null;
  stream_url: string | null;
  raffle_id: string | null;
  status: 'scheduled' | 'live' | 'completed' | 'canceled';
  is_visible: boolean;
  show_as_alert: boolean;
  created_at: string;
  raffles?: {
    id: string;
    title: string;
  } | null;
};

type LiveEventsTableProps = {
  initialEvents: LiveEvent[];
  totalCount: number;
  availableRaffles: { id: string; title: string }[];
};

type EventFormData = {
  title: string;
  description: string;
  start_at: string;
  countdown_start_at: string;
  stream_url: string;
  raffle_id: string;
  is_visible: boolean;
};

const STATUS_LABELS = {
  scheduled: 'Programado',
  live: 'En Vivo',
  completed: 'Completado',
  canceled: 'Cancelado',
};

const STATUS_COLORS = {
  scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  live: 'bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  canceled: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
};

export function LiveEventsTable({ initialEvents, totalCount, availableRaffles }: Readonly<LiveEventsTableProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LiveEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Detectar parámetro ?crear=true y abrir modal automáticamente
  useEffect(() => {
    if (searchParams.get('crear') === 'true') {
      setShowCreateModal(true);
      // Limpiar el parámetro de la URL
      router.replace('/administrador/eventos-vivo', { scroll: false });
    }
  }, [searchParams, router]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowCreateModal(true);
  };

  const handleEditEvent = (event: LiveEvent) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const handleDeleteEvent = (event: LiveEvent) => {
    setSelectedEvent(event);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('live_events')
      .delete()
      .eq('id', selectedEvent.id);

    if (error) {
      console.error('Error deleting event:', error);
      alert('Error al eliminar el evento');
    } else {
      setEvents(events.filter((e) => e.id !== selectedEvent.id));
      setShowDeleteModal(false);
      setSelectedEvent(null);
    }

    setIsLoading(false);
  };

  const handleChangeStatus = async (event: LiveEvent, newStatus: LiveEvent['status']) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('live_events')
      .update({ status: newStatus })
      .eq('id', event.id);

    if (error) {
      console.error('Error updating status:', error);
      alert('Error al cambiar el estado');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleToggleVisibility = async (event: LiveEvent) => {
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const newVisibility = !event.is_visible;

    // Si se va a ocultar y tiene alerta activa, desactivar la alerta también
    const updates: { is_visible: boolean; show_as_alert?: boolean } = {
      is_visible: newVisibility
    };

    if (!newVisibility && event.show_as_alert) {
      updates.show_as_alert = false;
    }

    const { error } = await supabase
      .from('live_events')
      .update(updates)
      .eq('id', event.id);

    if (error) {
      console.error('Error updating visibility:', error);
      alert('Error al cambiar la visibilidad');
    } else {
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleShowAlertModal = (event: LiveEvent) => {
    // Validaciones antes de mostrar el modal
    if (!event.is_visible) {
      alert('⚠️ Primero debes hacer visible el evento para poder activar la alerta.');
      return;
    }

    if (event.status === 'completed' || event.status === 'canceled') {
      alert('⚠️ No puedes activar alertas en eventos completados o cancelados.');
      return;
    }

    // Validar si el evento ya expiró
    const eventDate = new Date(event.start_at);
    const now = new Date();
    const hoursSinceStart = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceStart > 2) {
      alert('⚠️ Este evento comenzó hace más de 2 horas. No se puede activar como alerta.');
      return;
    }

    setSelectedEvent(event);
    setShowAlertModal(true);
  };

  const confirmToggleAlert = async () => {
    if (!selectedEvent) return;

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Primero desactivar todos los demás eventos como alerta
    await supabase
      .from('live_events')
      .update({ show_as_alert: false })
      .neq('id', selectedEvent.id);

    // Luego toggle el evento seleccionado
    const { error } = await supabase
      .from('live_events')
      .update({ show_as_alert: !selectedEvent.show_as_alert })
      .eq('id', selectedEvent.id);

    if (error) {
      console.error('Error updating alert status:', error);
      alert('Error al cambiar el estado de alerta');
    } else {
      setShowAlertModal(false);
      setSelectedEvent(null);
      router.refresh();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header con guía rápida */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--foreground)]">Eventos en Vivo</h1>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Gestiona transmisiones en vivo y anuncios públicos
            </p>
          </div>
          <button
            onClick={handleCreateEvent}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:opacity-90"
          >
            <span className="text-lg">➕</span>
            Crear Evento
          </button>
        </div>

        {/* Panel de ayuda rápida mejorado */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">Flujo de trabajo</h3>
              
              <div className="grid gap-3 text-sm text-blue-600/90 dark:text-blue-400/90 sm:grid-cols-2">
                <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-500/20">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">1️⃣</span>
                    <div>
                      <p className="font-bold mb-1">Crear Evento</p>
                      <p className="text-xs">Define título, descripción, fecha/hora de inicio y URL de transmisión (opcional).</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-500/20">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">2️⃣</span>
                    <div>
                      <p className="font-bold mb-1">Hacer Visible</p>
                      <p className="text-xs">Click en 👁️ para publicar en la página de eventos. Por defecto está oculto.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-500/20">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">3️⃣</span>
                    <div>
                      <p className="font-bold mb-1">Destacar con Alerta</p>
                      <p className="text-xs">Click en 🔔 para mostrar en barra superior. <strong>Solo eventos visibles y próximos.</strong></p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-500/20">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">4️⃣</span>
                    <div>
                      <p className="font-bold mb-1">Gestionar Estado</p>
                      <p className="text-xs">🔴 Iniciar cuando empiece, ✅ Finalizar al terminar, o ⛔ Cancelar si no se realizará.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 mt-3">
                <span className="text-sm">⚡</span>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <strong>Tip:</strong> La alerta se desactiva automáticamente si ocultas el evento o si pasan más de 2 horas desde el inicio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] sm:w-48"
          >
            <option value="all">Todos los estados</option>
            <option value="scheduled">Programado</option>
            <option value="live">En Vivo</option>
            <option value="completed">Completado</option>
            <option value="canceled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabla con tooltips mejorados */}
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Evento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Sorteo Asociado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <div className="flex items-center gap-1">
                    Publicado
                    <span className="text-xs cursor-help" title="Si está publicado, aparece en la página de eventos">ℹ️</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <div className="flex items-center gap-1">
                    Destacado
                    <span className="text-xs cursor-help" title="Muestra el evento en barra superior + página principal (solo 1 permitido)">ℹ️</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🎬</span>
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">
                        No hay eventos
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No se encontraron eventos con los filtros aplicados'
                          : 'Crea tu primer evento en vivo para comenzar'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-[color:var(--muted)]/20">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="text-xs text-[color:var(--muted-foreground)] line-clamp-1">
                            {event.description}
                          </p>
                        )}
                        {event.stream_url && (
                          <a
                            href={event.stream_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            🔗 Ver stream
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_COLORS[event.status]
                        }`}
                      >
                        {STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {event.raffles ? (
                        <span className="text-sm text-[color:var(--foreground)]">
                          🎁 {event.raffles.title}
                        </span>
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          Sin sorteo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-[color:var(--muted-foreground)]">
                        <p>📅 {new Date(event.start_at).toLocaleDateString('es-EC', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}</p>
                        <p>🕐 {new Date(event.start_at).toLocaleTimeString('es-EC', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleVisibility(event)}
                        disabled={isLoading}
                        title={event.is_visible 
                          ? 'Publicado: aparece en listado de eventos. Click para ocultar.' 
                          : 'Oculto: no aparece en ningún lado. Click para publicar.'}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 ${
                          event.is_visible
                            ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                            : 'bg-gray-500/15 text-gray-600 hover:bg-gray-500/25 dark:text-gray-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {event.is_visible ? (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                            </svg>
                            Publicado
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                            </svg>
                            Oculto
                          </>
                        )}
                      </button>
                      {event.show_as_alert && !event.is_visible && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ Alerta se desactivará
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="relative group">
                        <button
                          onClick={() => handleShowAlertModal(event)}
                          disabled={isLoading || !event.is_visible || event.status === 'completed' || event.status === 'canceled'}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 ${
                            event.show_as_alert
                              ? 'bg-red-500/15 text-red-600 hover:bg-red-500/25 dark:text-red-400'
                              : event.is_visible && event.status !== 'completed' && event.status !== 'canceled'
                              ? 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 dark:text-blue-400'
                              : 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {event.show_as_alert ? (
                            <>
                              <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                              </svg>
                              Destacado
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                              </svg>
                              Normal
                            </>
                          )}
                        </button>
                        {(!event.is_visible || event.status === 'completed' || event.status === 'canceled') && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 shadow-lg">
                            {!event.is_visible && '⚠️ Primero publica el evento'}
                            {event.is_visible && (event.status === 'completed' || event.status === 'canceled') && '⚠️ No disponible para eventos finalizados'}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botones de cambio de estado con tooltips mejorados */}
                        {event.status === 'scheduled' && (
                          <button
                            onClick={() => handleChangeStatus(event, 'live')}
                            disabled={isLoading}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-500/20 hover:scale-105 dark:text-red-400 disabled:opacity-50"
                            title="🔴 Marcar como EN VIVO (aparecerá con animación roja)"
                          >
                            🔴 Iniciar
                          </button>
                        )}
                        {event.status === 'live' && (
                          <button
                            onClick={() => handleChangeStatus(event, 'completed')}
                            disabled={isLoading}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:bg-emerald-500/20 hover:scale-105 dark:text-emerald-400 disabled:opacity-50"
                            title="✅ Marcar como COMPLETADO (dejará de mostrarse)"
                          >
                            ✅ Finalizar
                          </button>
                        )}
                        {(event.status === 'scheduled' || event.status === 'live') && (
                          <button
                            onClick={() => handleChangeStatus(event, 'canceled')}
                            disabled={isLoading}
                            className="rounded-lg border border-gray-500/30 bg-gray-500/10 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-500/20 hover:scale-105 dark:text-gray-400 disabled:opacity-50"
                            title="⛔ CANCELAR evento (no se mostrará más)"
                          >
                            ⛔ Cancelar
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleEditEvent(event)}
                          disabled={isLoading}
                          className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--foreground)] transition-all hover:bg-[color:var(--muted)]/40 hover:scale-110 disabled:opacity-50"
                          title="✏️ Editar información del evento"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          disabled={isLoading}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-600 transition-all hover:bg-red-500/20 hover:scale-110 dark:text-red-400 disabled:opacity-50"
                          title="🗑️ Eliminar permanentemente"
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
        <EventFormModal
          event={selectedEvent}
          availableRaffles={availableRaffles}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedEvent(null);
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[color:var(--foreground)] mb-2">
              ¿Eliminar evento?
            </h3>
            <p className="text-sm text-[color:var(--muted-foreground)] mb-6">
              ¿Estás seguro de que deseas eliminar el evento "{selectedEvent.title}"? Esta acción no se puede deshacer.
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

      {/* Modal de Confirmación - Destacar Evento */}
      {showAlertModal && selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowAlertModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-3">
                <span className="text-2xl">{selectedEvent.show_as_alert ? '🔕' : '⭐'}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[color:var(--foreground)]">
                  {selectedEvent.show_as_alert ? 'Quitar Destacado' : 'Destacar Evento'}
                </h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  "{selectedEvent.title}"
                </p>
              </div>
            </div>
            
            {selectedEvent.show_as_alert ? (
              <div className="space-y-4 mb-6">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">📉</span>
                    <div>
                      <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        El evento volverá a ser normal
                      </p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                        • Ya no aparecerá en la barra superior destacada<br/>
                        • Seguirá visible en el listado de eventos<br/>
                        • Los usuarios podrán acceder desde la página de eventos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <div className="rounded-lg border border-gradient-to-r from-blue-500 to-purple-600 bg-gradient-to-r from-blue-500/10 to-purple-600/10 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">✨</span>
                    <div>
                      <p className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Máxima visibilidad para tu evento
                      </p>
                      <ul className="text-xs text-blue-600/90 dark:text-blue-400/90 space-y-1.5">
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span><strong>Barra superior</strong> en dashboard de participantes (sticky)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span><strong>Anuncio destacado</strong> en página principal pública</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span><strong>Animación y contador</strong> regresivo hasta el inicio</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span><strong>Acceso directo</strong> al stream (si está configurado)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <p className="text-xs text-purple-600/90 dark:text-purple-400/90">
                      <strong>Solo 1 evento destacado:</strong> Al activar este, cualquier otro destacado se volverá normal automáticamente.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
                  <p className="text-xs font-semibold text-[color:var(--foreground)] mb-3 flex items-center gap-2">
                    <span className="text-base">📱</span>
                    Vista previa en barra superior:
                  </p>
                  <div className="rounded-lg border-2 border-blue-500 bg-gradient-to-r from-blue-500/20 via-purple-600/20 to-blue-500/20 p-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="text-2xl">
                          {selectedEvent.status === 'live' ? '🔴' : '📅'}
                        </span>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {selectedEvent.title}
                        </p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                          {selectedEvent.description || 'Evento en vivo - Conéctate y participa'}
                        </p>
                        {selectedEvent.start_at && (
                          <p className="text-xs font-mono text-blue-600/70 dark:text-blue-400/70 mt-1">
                            📅 {new Date(selectedEvent.start_at).toLocaleString('es-EC', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      {selectedEvent.stream_url && (
                        <div className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                          Ver Live
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAlertModal(false)}
                disabled={isLoading}
                className="rounded-lg border border-[color:var(--border)] px-5 py-2.5 text-sm font-semibold text-[color:var(--foreground)] transition-all hover:bg-[color:var(--muted)]/40 hover:scale-105 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmToggleAlert}
                disabled={isLoading}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 ${
                  selectedEvent.show_as_alert
                    ? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30'
                }`}
              >
                {isLoading ? 'Procesando...' : (
                  selectedEvent.show_as_alert ? '� Volver a Normal' : '⭐ Destacar Evento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventFormModal({
  event,
  availableRaffles,
  onClose,
  onSuccess,
}: {
  event: LiveEvent | null;
  availableRaffles: { id: string; title: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: event?.title || '',
    description: event?.description || '',
    start_at: event?.start_at ? new Date(event.start_at).toISOString().slice(0, 16) : '',
    countdown_start_at: event?.countdown_start_at ? new Date(event.countdown_start_at).toISOString().slice(0, 16) : '',
    stream_url: event?.stream_url || '',
    raffle_id: event?.raffle_id || '',
    is_visible: event?.is_visible ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();

    const payload = {
      title: formData.title,
      description: formData.description || null,
      start_at: new Date(formData.start_at).toISOString(),
      countdown_start_at: formData.countdown_start_at ? new Date(formData.countdown_start_at).toISOString() : null,
      stream_url: formData.stream_url || null,
      raffle_id: formData.raffle_id || null,
      is_visible: formData.is_visible,
    };

    if (event) {
      // Update existing event
      const { error } = await supabase
        .from('live_events')
        .update(payload)
        .eq('id', event.id);

      if (error) {
        console.error('Error updating event:', error);
        alert('Error al actualizar el evento');
      } else {
        onSuccess();
      }
    } else {
      // Create new event
      const { error } = await supabase
        .from('live_events')
        .insert({ ...payload, status: 'scheduled' });

      if (error) {
        console.error('Error creating event:', error);
        alert('Error al crear el evento');
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
        className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[color:var(--foreground)]">
            {event ? '✏️ Editar evento' : '🎬 Crear nuevo evento'}
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
              Título del evento *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Ej: Sorteo en Vivo - Gran Premio"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Describe el evento..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              Sorteo asociado
            </label>
            <select
              value={formData.raffle_id}
              onChange={(e) => setFormData({ ...formData, raffle_id: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
            >
              <option value="">Sin sorteo asociado</option>
              {availableRaffles.map((raffle) => (
                <option key={raffle.id} value={raffle.id}>
                  {raffle.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-1">
                Fecha y hora de inicio *
              </label>
              <p className="text-xs text-[color:var(--muted-foreground)] mb-2">
                🎯 Momento exacto en que comienza el evento en vivo
              </p>
              <input
                type="datetime-local"
                required
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-1">
                Inicio de cuenta regresiva (opcional)
              </label>
              <p className="text-xs text-[color:var(--muted-foreground)] mb-2">
                ⏰ Cuándo empezar a mostrar "Faltan X horas" (antes del evento)
              </p>
              <input
                type="datetime-local"
                value={formData.countdown_start_at}
                onChange={(e) => setFormData({ ...formData, countdown_start_at: e.target.value })}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[color:var(--foreground)] mb-2">
              URL del stream
            </label>
            <input
              type="url"
              value={formData.stream_url}
              onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Ej: YouTube, Facebook Live, Twitch, etc.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
            <input
              type="checkbox"
              id="is_visible"
              checked={formData.is_visible}
              onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]"
            />
            <label htmlFor="is_visible" className="text-sm font-semibold text-[color:var(--foreground)] cursor-pointer">
              Visible para usuarios (mostrar en página pública)
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[color:var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-[color:var(--border)] px-6 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[color:var(--accent)] px-6 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : (event ? 'Actualizar' : 'Crear evento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
