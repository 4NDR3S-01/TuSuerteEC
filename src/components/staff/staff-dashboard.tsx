'use client';

import Link from 'next/link';

type Raffle = {
  id: string;
  title: string;
  status: string;
  draw_date: string;
  total_winners: number;
};

type LiveEvent = {
  id: string;
  title: string;
  start_at: string;
  status: string;
  is_visible: boolean;
};

type Winner = {
  id: string;
  status: string;
  contact_attempts: number;
  created_at: string;
  raffles: {
    title: string;
  };
};

type RaffleEntry = {
  id: string;
  entry_source: string;
  ticket_number: string;
  is_winner: boolean;
  created_at: string;
  raffles: {
    title: string;
  };
  profiles: {
    full_name: string;
  };
};

type StaffDashboardProps = {
  activeRaffles: Raffle[];
  liveEvents: LiveEvent[];
  pendingWinners: Winner[];
  recentEntries: RaffleEntry[];
};

export function StaffDashboard({ 
  activeRaffles, 
  liveEvents, 
  pendingWinners, 
  recentEntries 
}: StaffDashboardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'live':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending_contact':
        return 'bg-yellow-100 text-yellow-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'prize_delivered':
        return 'bg-green-100 text-green-800';
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
      case 'pending_contact':
        return 'Pendiente Contacto';
      case 'contacted':
        return 'Contactado';
      case 'prize_delivered':
        return 'Premio Entregado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[color:var(--border)] bg-[color:var(--muted)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[color:var(--foreground)]">Panel de Staff</h1>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Monitorea sorteos, transmisiones y gestiona ganadores
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/staff/sorteos"
                className="inline-flex items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
              >
                Monitorear Sorteos
              </Link>
              <Link
                href="/staff/ganadores"
                className="inline-flex items-center rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] hover:opacity-90"
              >
                Gestionar Ganadores
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Métricas */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)] mb-4">Resumen de Actividad</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[color:var(--muted-foreground)] truncate">
                        Sorteos Activos
                      </dt>
                      <dd className="text-lg font-medium text-[color:var(--foreground)]">
                        {activeRaffles.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[color:var(--muted-foreground)] truncate">
                        Eventos en Vivo
                      </dt>
                      <dd className="text-lg font-medium text-[color:var(--foreground)]">
                        {liveEvents.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500 text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[color:var(--muted-foreground)] truncate">
                        Ganadores Pendientes
                      </dt>
                      <dd className="text-lg font-medium text-[color:var(--foreground)]">
                        {pendingWinners.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[color:var(--muted-foreground)] truncate">
                        Participaciones Recientes
                      </dt>
                      <dd className="text-lg font-medium text-[color:var(--foreground)]">
                        {recentEntries.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Sorteos Activos */}
          <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[color:var(--foreground)]">Sorteos Activos</h3>
                <Link
                  href="/staff/sorteos"
                  className="text-sm font-medium text-[color:var(--accent)] hover:text-[color:var(--accent)]/80"
                >
                  Ver todos
                </Link>
              </div>
              <div className="mt-4">
                {activeRaffles.length === 0 ? (
                  <p className="text-sm text-[color:var(--muted-foreground)]">No hay sorteos activos</p>
                ) : (
                  <ul className="space-y-3">
                    {activeRaffles.slice(0, 3).map((raffle) => (
                      <li key={raffle.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--foreground)]">{raffle.title}</p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            Sorteo: {formatDate(raffle.draw_date)}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {raffle.total_winners} ganador{raffle.total_winners > 1 ? 'es' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Eventos en Vivo */}
          <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[color:var(--foreground)]">Eventos en Vivo</h3>
                <Link
                  href="/staff/transmisiones"
                  className="text-sm font-medium text-[color:var(--accent)] hover:text-[color:var(--accent)]/80"
                >
                  Ver todos
                </Link>
              </div>
              <div className="mt-4">
                {liveEvents.length === 0 ? (
                  <p className="text-sm text-[color:var(--muted-foreground)]">No hay eventos programados</p>
                ) : (
                  <ul className="space-y-3">
                    {liveEvents.slice(0, 3).map((event) => (
                      <li key={event.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--foreground)]">{event.title}</p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {formatDate(event.start_at)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(event.status)}`}>
                          {getStatusText(event.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ganadores Pendientes */}
        {pendingWinners.length > 0 && (
          <div className="mt-8">
            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[color:var(--foreground)]">Ganadores Pendientes de Contacto</h3>
                  <Link
                    href="/staff/ganadores"
                    className="text-sm font-medium text-[color:var(--accent)] hover:text-[color:var(--accent)]/80"
                  >
                    Gestionar todos
                  </Link>
                </div>
                <div className="mt-4">
                  <ul className="space-y-3">
                    {pendingWinners.slice(0, 5).map((winner) => (
                      <li key={winner.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--foreground)]">{winner.raffles.title}</p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {formatDate(winner.created_at)} • {winner.contact_attempts} intentos
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(winner.status)}`}>
                          {getStatusText(winner.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participaciones Recientes */}
        {recentEntries.length > 0 && (
          <div className="mt-8">
            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-[color:var(--foreground)]">Participaciones Recientes</h3>
                <div className="mt-4">
                  <ul className="space-y-3">
                    {recentEntries.slice(0, 5).map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--foreground)]">
                            {entry.profiles.full_name} - {entry.raffles.title}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            Boleto: {entry.ticket_number} • {formatDate(entry.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            entry.entry_source === 'subscription' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.entry_source === 'subscription' ? 'Suscripción' : 'Compra'}
                          </span>
                          {entry.is_winner && (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                              🏆 Ganador
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
