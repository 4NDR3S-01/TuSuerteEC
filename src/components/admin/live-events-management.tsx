'use client';

import { useState } from 'react';
import Link from 'next/link';

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
  created_at: string;
  updated_at: string;
  raffles?: {
    title: string;
  };
};

type LiveEventsManagementProps = {
  events: LiveEvent[];
};

export function LiveEventsManagement({ events }: LiveEventsManagementProps) {
  const [isCreating, setIsCreating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'live':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programado';
      case 'live':
        return 'En Vivo';
      case 'completed':
        return 'Completado';
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  const isLive = (status: string, dateString: string) => {
    const now = new Date();
    const eventDate = new Date(dateString);
    return status === 'live' || (status === 'scheduled' && eventDate <= now);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[color:var(--border)] bg-[color:var(--muted)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <Link href="/administrador" className="text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 flex-shrink-0 text-[color:var(--muted-foreground)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-[color:var(--foreground)]">Eventos en Vivo</span>
                    </div>
                  </li>
                </ol>
              </nav>
              <h1 className="mt-2 text-3xl font-bold text-[color:var(--foreground)]">Gestión de Eventos en Vivo</h1>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Programa y gestiona las transmisiones en vivo de sorteos
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] hover:opacity-90"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Evento
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {events.length === 0 ? (
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[color:var(--foreground)]">No hay eventos programados</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Comienza creando tu primer evento en vivo.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] hover:opacity-90"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Evento
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">{event.title}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(event.status)}`}>
                          {getStatusText(event.status)}
                        </span>
                        {event.is_visible && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Visible
                          </span>
                        )}
                        {isLive(event.status, event.start_at) && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 animate-pulse">
                            🔴 EN VIVO
                          </span>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{event.description}</p>
                      )}
                      
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--foreground)]">Fecha y Hora</p>
                          <p className="text-sm text-[color:var(--muted-foreground)]">{formatDate(event.start_at)}</p>
                        </div>
                        {event.raffles && (
                          <div>
                            <p className="text-sm font-medium text-[color:var(--foreground)]">Sorteo Asociado</p>
                            <p className="text-sm text-[color:var(--muted-foreground)]">{event.raffles.title}</p>
                          </div>
                        )}
                      </div>

                      {event.stream_url && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-[color:var(--foreground)]">URL de Transmisión</p>
                          <a 
                            href={event.stream_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-[color:var(--accent)] hover:underline"
                          >
                            {event.stream_url}
                          </a>
                        </div>
                      )}

                      {event.countdown_start_at && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-[color:var(--foreground)]">Inicio de Countdown</p>
                          <p className="text-sm text-[color:var(--muted-foreground)]">{formatDate(event.countdown_start_at)}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col space-y-2">
                      <button className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)]">
                        Editar
                      </button>
                      {event.status === 'scheduled' && (
                        <button className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200">
                          Iniciar Transmisión
                        </button>
                      )}
                      {event.status === 'live' && (
                        <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                          Finalizar
                        </button>
                      )}
                      <button className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        event.is_visible
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}>
                        {event.is_visible ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
