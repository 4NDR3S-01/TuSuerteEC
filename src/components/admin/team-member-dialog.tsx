'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, UserPlus, X } from 'lucide-react';
import { createTeamMember } from '../../lib/actions/admin';
import { Button, Field, Input, Notice, inputStyles } from '../ui/kit';

const EMPTY = { fullName: '', email: '', idNumber: '', phoneNumber: '', role: 'staff' as 'staff' | 'admin' };

/** Alta de cuentas del equipo por el administrador, con contraseña temporal visible una sola vez */
export function TeamMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await createTeamMember(form);
    setSaving(false);
    if (result.error || !result.data) return setError(result.error ?? 'No se pudo crear la cuenta.');
    setCreated(result.data);
    router.refresh();
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Usuario: ${created.email}\nContraseña temporal: ${created.temporaryPassword}`);
      setCopied(true);
    } catch {
      /* el navegador no permite copiar: la contraseña está visible en pantalla */
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus aria-hidden /> Nueva cuenta del equipo</Button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => !saving && !created && close()}>
          <div role="dialog" aria-modal="true" aria-labelledby="team-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[color:var(--background)] p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="team-title" className="text-lg font-bold">Nueva cuenta del equipo</h2>
                <p className="text-sm text-[color:var(--muted-foreground)]">La persona recibirá una contraseña temporal y deberá cambiarla al ingresar.</p>
              </div>
              <button type="button" onClick={close} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar"><X className="size-5" aria-hidden /></button>
            </div>

            {created ? (
              <div className="mt-5 space-y-4">
                <Notice tone="success" title="Cuenta creada">Entrega estos datos por un canal privado. La contraseña no se volverá a mostrar.</Notice>
                <dl className="space-y-2 rounded-xl bg-[color:var(--muted)] p-4 font-mono text-sm">
                  <div><dt className="font-sans text-xs text-[color:var(--muted-foreground)]">Usuario</dt><dd className="break-all">{created.email}</dd></div>
                  <div><dt className="font-sans text-xs text-[color:var(--muted-foreground)]">Contraseña temporal</dt><dd className="text-lg font-bold">{created.temporaryPassword}</dd></div>
                </dl>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={copy}>{copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copiado' : 'Copiar datos'}</Button>
                  <Button className="flex-1" onClick={close}>Listo</Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {error && <Notice tone="danger">{error}</Notice>}
                <Field label="Nombre completo" htmlFor="tm-name" required>
                  <Input id="tm-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={120} />
                </Field>
                <Field label="Correo" htmlFor="tm-email" required>
                  <Input id="tm-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cédula" htmlFor="tm-id" required>
                    <Input id="tm-id" inputMode="numeric" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </Field>
                  <Field label="Teléfono" htmlFor="tm-phone" required>
                    <Input id="tm-phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+593…" />
                  </Field>
                </div>
                <Field label="Rol" htmlFor="tm-role" hint="Staff: revisa pagos, ganadores y eventos. Administrador: acceso total.">
                  <select id="tm-role" className={inputStyles} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'staff' | 'admin' })}>
                    <option value="staff">Staff</option>
                    <option value="admin">Administrador</option>
                  </select>
                </Field>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={close} disabled={saving}>Cancelar</Button>
                  <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="animate-spin" aria-hidden />} Crear cuenta</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
