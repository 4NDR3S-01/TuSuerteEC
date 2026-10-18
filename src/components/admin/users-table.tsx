'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Download, Loader2, RotateCcw, Search, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { deleteUser, reactivateUser, suspendUser, updateUserRole } from '../../lib/actions/admin';
import { useToast } from '../../hooks/use-toast';
import { formatDate } from '../../lib/raffle/labels';
import { downloadCsv, toCsv } from '../../lib/csv';
import { Badge, Button, Card, EmptyState, Field, inputStyles } from '../ui/kit';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone_number: string;
  id_number: string;
  address: string;
  city: string | null;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  history: number;
};

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', staff: 'Staff', participant: 'Participante' };
const PAGE_SIZE = 25;

type Dialog = { kind: 'role' | 'suspend' | 'delete'; user: UserRow } | null;

export function UsersTable({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [newRole, setNewRole] = useState('participant');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return initialUsers.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (statusFilter === 'suspended' && !user.suspended_at) return false;
      if (statusFilter === 'active' && user.suspended_at) return false;
      if (!term) return true;
      return [user.full_name, user.email, user.id_number, user.phone_number].some((value) => value?.toLowerCase().includes(term));
    });
  }, [initialUsers, search, roleFilter, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts = {
    total: initialUsers.length,
    admins: initialUsers.filter((user) => user.role === 'admin').length,
    staff: initialUsers.filter((user) => user.role === 'staff').length,
    suspended: initialUsers.filter((user) => user.suspended_at).length,
  };

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, success: string) => {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (!result.success) {
      showToast({ type: 'error', description: result.error ?? 'No se pudo completar la acción.' });
      return;
    }
    showToast({ type: 'success', description: success });
    setDialog(null);
    setReason('');
    router.refresh();
  };

  const exportCsv = () => {
    const csv = toCsv(
      ['Nombre', 'Correo', 'Cédula', 'Rol', 'Teléfono', 'Ciudad', 'Dirección', 'Registro', 'Estado'],
      filtered.map((user) => [user.full_name, user.email, user.id_number, ROLE_LABELS[user.role] ?? user.role, user.phone_number, user.city, user.address, formatDate(user.created_at), user.suspended_at ? 'Suspendido' : 'Activo']),
    );
    downloadCsv(`usuarios_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const renderActions = (user: UserRow) =>
    user.id === currentUserId ? null : (
      <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Cambiar rol de ${user.full_name}`} title="Cambiar rol" onClick={() => { setNewRole(user.role); setDialog({ kind: 'role', user }); }}>
                            <UserCog aria-hidden />
                          </Button>
                          {user.suspended_at ? (
                            <Button variant="ghost" size="icon" aria-label={`Reactivar a ${user.full_name}`} title="Reactivar" disabled={busy} onClick={() => run(() => reactivateUser(user.id), 'Cuenta reactivada.')}>
                              <RotateCcw aria-hidden />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" aria-label={`Suspender a ${user.full_name}`} title="Suspender" onClick={() => setDialog({ kind: 'suspend', user })}>
                              <Ban aria-hidden />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar a ${user.full_name}`}
                            title={user.history > 0 ? 'Tiene historial: suspéndela en lugar de eliminarla' : 'Eliminar'}
                            disabled={user.history > 0}
                            onClick={() => setDialog({ kind: 'delete', user })}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
    );

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Usuarios', counts.total],
          ['Administradores', counts.admins],
          ['Staff', counts.staff],
          ['Suspendidos', counts.suspended],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
            <dt className="text-sm text-[color:var(--muted-foreground)]">{label}</dt>
          </Card>
        ))}
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar usuarios</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" aria-hidden />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nombre, correo, cédula o teléfono" className={`${inputStyles} pl-10`} />
        </label>
        <select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className={`${inputStyles} lg:w-48`}>
          <option value="all">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className={`${inputStyles} lg:w-44`}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
        <Button variant="secondary" onClick={exportCsv}><Download aria-hidden /> Exportar CSV</Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Users} title="No hay usuarios con estos filtros" />
      ) : (
        <>
        {/* Móvil: tarjetas con las acciones siempre visibles */}
        <div className="space-y-3 md:hidden">
          {visible.map((user) => (
            <Card key={user.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{user.full_name}{user.id === currentUserId && <span className="ml-2 text-xs text-[color:var(--muted-foreground)]">(tú)</span>}</p>
                  <p className="break-all text-xs text-[color:var(--muted-foreground)]">{user.email}</p>
                </div>
                <Badge tone={user.role === 'admin' ? 'accent' : user.role === 'staff' ? 'info' : 'neutral'}>{ROLE_LABELS[user.role] ?? user.role}</Badge>
              </div>
              <p className="text-xs text-[color:var(--muted-foreground)]">Cédula {user.id_number} · {user.phone_number} · desde {formatDate(user.created_at)}</p>
              <div className="flex items-center justify-between gap-2">
                {user.suspended_at ? <Badge tone="danger"><Ban aria-hidden /> Suspendido</Badge> : <Badge tone="success"><ShieldCheck aria-hidden /> Activo</Badge>}
                {renderActions(user)}
              </div>
            </Card>
          ))}
        </div>
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[color:var(--muted)]/60 text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th scope="col" className="px-4 py-3">Usuario</th>
                <th scope="col" className="px-4 py-3">Cédula / teléfono</th>
                <th scope="col" className="px-4 py-3">Rol</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Registro</th>
                <th scope="col" className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {visible.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{user.full_name}{isSelf && <span className="ml-2 text-xs text-[color:var(--muted-foreground)]">(tú)</span>}</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono">{user.id_number}</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">{user.phone_number}</p>
                    </td>
                    <td className="px-4 py-3"><Badge tone={user.role === 'admin' ? 'accent' : user.role === 'staff' ? 'info' : 'neutral'}>{ROLE_LABELS[user.role] ?? user.role}</Badge></td>
                    <td className="px-4 py-3">
                      {user.suspended_at ? (
                        <Badge tone="danger" title={user.suspension_reason ?? undefined}><Ban aria-hidden /> Suspendido</Badge>
                      ) : (
                        <Badge tone="success"><ShieldCheck aria-hidden /> Activo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted-foreground)]">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      {renderActions(user)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        </>
      )}

      {pages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-between text-sm">
          <span className="text-[color:var(--muted-foreground)]">Página {page} de {pages} · {filtered.length} usuarios</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button variant="secondary" size="sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </nav>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setDialog(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" className="w-full max-w-md space-y-4 rounded-2xl bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 id="user-dialog-title" className="text-lg font-bold">
              {dialog.kind === 'role' ? 'Cambiar rol' : dialog.kind === 'suspend' ? 'Suspender cuenta' : 'Eliminar cuenta'}
            </h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">{dialog.user.full_name} · {dialog.user.email}</p>

            {dialog.kind === 'role' && (
              <>
                <Field label="Nuevo rol" htmlFor="new-role">
                  <select id="new-role" value={newRole} onChange={(event) => setNewRole(event.target.value)} className={inputStyles}>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Staff: revisa pagos, gestiona ganadores y eventos. Administrador: acceso total. La persona deberá iniciar sesión de nuevo.
                </p>
              </>
            )}
            {dialog.kind === 'suspend' && (
              <Field label="Motivo (queda en la auditoría)" htmlFor="suspend-reason" required>
                <textarea id="suspend-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={3} className={inputStyles} />
              </Field>
            )}
            {dialog.kind === 'delete' && <p className="text-sm">La cuenta no tiene pagos, boletos ni premios. Esta acción no se puede deshacer.</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
              <Button
                variant={dialog.kind === 'role' ? 'primary' : 'danger'}
                disabled={busy}
                onClick={() =>
                  dialog.kind === 'role'
                    ? run(() => updateUserRole(dialog.user.id, newRole), 'Rol actualizado.')
                    : dialog.kind === 'suspend'
                      ? run(() => suspendUser(dialog.user.id, reason), 'Cuenta suspendida.')
                      : run(() => deleteUser(dialog.user.id), 'Cuenta eliminada.')
                }
              >
                {busy && <Loader2 className="animate-spin" aria-hidden />}
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
