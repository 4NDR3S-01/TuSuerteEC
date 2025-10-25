'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { AdminCard } from './ui/admin-card';
import { AdminSectionHeader } from './ui/admin-section-header';

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  phone_number: string | null;
  id_number: string | null;
  address: string | null;
  created_at: string | null;
};

type UsersTableProps = {
  initialUsers: UserProfile[];
  totalCount: number;
};

const ITEMS_PER_PAGE = 20;

function formatRole(value: string | null | undefined) {
  if (!value) return 'Sin asignar';
  const roles: Record<string, string> = {
    admin: 'Administrador',
    staff: 'Staff',
    participant: 'Participante',
  };
  return roles[value] ?? value;
}

function getRoleBadgeColor(role: string | null) {
  switch (role) {
    case 'admin':
      return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
    case 'staff':
      return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
    case 'participant':
      return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
  }
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('es-EC', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function UsersTable({ initialUsers, totalCount }: UsersTableProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = getSupabaseBrowserClient();

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = ['Nombre Completo', 'Email', 'Cédula', 'Rol', 'Teléfono', 'Dirección', 'Fecha de Registro'];
    const rows = filteredUsers.map(user => [
      user.full_name || '',
      user.email || '',
      user.id_number || '',
      formatRole(user.role),
      user.phone_number || '',
      user.address || '',
      formatDate(user.created_at)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      description: `${filteredUsers.length} usuarios exportados a CSV.`,
    });
  };

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id_number?.includes(searchTerm);

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Cambiar rol de usuario
  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Actualizar el estado local
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));

      showToast({
        type: 'success',
        description: `Rol actualizado a ${formatRole(newRole)} exitosamente.`,
      });

      setShowRoleModal(false);
      setSelectedUser(null);
      router.refresh();
    } catch (error) {
      console.error('Error updating role:', error);
      showToast({
        type: 'error',
        description: 'No se pudo actualizar el rol. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsLoading(true);

    try {
      // Primero eliminar el perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Luego eliminar el usuario de auth (requiere función RPC)
      const { error: authError } = await supabase.rpc('delete_user', {
        user_id: selectedUser.id,
      });

      if (authError) {
        console.warn('User deleted from profiles but auth deletion failed:', authError);
      }

      // Actualizar el estado local
      setUsers(users.filter(u => u.id !== selectedUser.id));

      showToast({
        type: 'success',
        description: 'Usuario eliminado exitosamente.',
      });

      setShowDeleteConfirm(false);
      setSelectedUser(null);
      router.refresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast({
        type: 'error',
        description: 'No se pudo eliminar el usuario. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AdminCard>
        <AdminSectionHeader
          title="Todos los usuarios"
          description={`${filteredUsers.length} de ${totalCount} usuarios registrados`}
        />

        {/* Filtros y búsqueda */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3">
              <input
                type="text"
                placeholder="Buscar por nombre, email o cédula..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="all">Todos los roles</option>
                <option value="admin">Administradores</option>
                <option value="staff">Staff</option>
                <option value="participant">Participantes</option>
              </select>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredUsers.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              title="Exportar a CSV"
            >
              <span>📥</span>
              Exportar CSV
            </button>
          </div>
          {(searchTerm || roleFilter !== 'all') && (
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
              <span>Filtros activos:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
                  Búsqueda: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-[color:var(--accent-foreground)]"
                  >
                    ✕
                  </button>
                </span>
              )}
              {roleFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
                  Rol: {formatRole(roleFilter)}
                  <button
                    onClick={() => setRoleFilter('all')}
                    className="ml-1 hover:text-[color:var(--accent-foreground)]"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                }}
                className="text-xs font-semibold text-[color:var(--accent)] hover:underline"
              >
                Limpiar todos
              </button>
            </div>
          )}
        </div>

        {/* Tabla de usuarios */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--border)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--border)] text-sm">
              <thead className="bg-[color:var(--muted)]/40 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold">Cédula</th>
                  <th className="px-4 py-3 text-left font-semibold">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-3 text-left font-semibold">Registro</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--background)]/60">
                {currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                      {searchTerm || roleFilter !== 'all'
                        ? 'No se encontraron usuarios con los filtros aplicados.'
                        : 'Todavía no se registran usuarios.'}
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-[color:var(--muted)]/20">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-[color:var(--foreground)]">
                            {user.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-[color:var(--muted-foreground)]">
                            {user.email || 'Sin correo'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--muted-foreground)]">
                        {user.id_number || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}
                        >
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--muted-foreground)]">
                        {user.phone_number || '—'}
                      </td>
                      <td className="px-4 py-4 text-xs text-[color:var(--muted-foreground)]">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsModal(true);
                            }}
                            className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
                            title="Ver detalles"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role || 'participant');
                              setShowRoleModal(true);
                            }}
                            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                            title="Cambiar rol"
                          >
                            Cambiar rol
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteConfirm(true);
                            }}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                            title="Eliminar usuario"
                          >
                            Eliminar
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="flex items-center px-4 text-sm text-[color:var(--muted-foreground)]">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Modal: Ver Detalles */}
      {showDetailsModal && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[color:var(--foreground)]">👤 Detalles del Usuario</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Nombre Completo
                  </label>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {selectedUser.full_name || 'Sin nombre'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Email
                  </label>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {selectedUser.email || 'Sin correo'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Cédula
                  </label>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {selectedUser.id_number || 'No registrada'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Rol
                  </label>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeColor(selectedUser.role)}`}>
                      {formatRole(selectedUser.role)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Teléfono
                  </label>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {selectedUser.phone_number || 'No registrado'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Fecha de Registro
                  </label>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {formatDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Dirección
                </label>
                <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                  {selectedUser.address || 'No registrada'}
                </p>
              </div>

              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  ID de Usuario
                </p>
                <p className="mt-1 break-all font-mono text-xs text-[color:var(--foreground)]">
                  {selectedUser.id}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setNewRole(selectedUser.role || 'participant');
                  setShowRoleModal(true);
                }}
                className="flex-1 rounded-lg bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
              >
                Cambiar rol
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Rol */}
      {showRoleModal && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowRoleModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[color:var(--foreground)]">Cambiar rol de usuario</h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Usuario: <span className="font-semibold text-[color:var(--foreground)]">{selectedUser.full_name}</span>
            </p>
            <div className="mt-6">
              <label className="block text-sm font-semibold text-[color:var(--foreground)]">
                Seleccionar nuevo rol
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="participant">Participante</option>
                <option value="staff">Staff</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                disabled={isLoading}
                className="flex-1 rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeRole}
                disabled={isLoading}
                className="flex-1 rounded-full bg-[color:var(--accent)] py-3 text-sm font-semibold text-[color:var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Actualizando...' : 'Confirmar cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {showDeleteConfirm && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-red-500/50 bg-[color:var(--background)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">⚠️ Confirmar eliminación</h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <span className="font-semibold text-[color:var(--foreground)]">{selectedUser.full_name}</span>?
            </p>
            <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
              Esta acción no se puede deshacer y eliminará todos los datos asociados.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                }}
                disabled={isLoading}
                className="flex-1 rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isLoading}
                className="flex-1 rounded-full bg-red-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Eliminando...' : 'Eliminar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
