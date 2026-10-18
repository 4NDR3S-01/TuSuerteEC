'use client';

import { useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { changePassword } from '../../lib/actions/auth';
import { Button, Field, Input, Notice } from '../ui/kit';

/** Cambio de contraseña. Al guardarla se cierran todas las sesiones y se vuelve a iniciar sesión. */
export function SecuritySettings({ mustChangePassword = false }: { mustChangePassword?: boolean }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.current) return setError('Ingresa tu contraseña actual.');
    if (form.next.length < 8 || !/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) {
      return setError('La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
    }
    if (form.next !== form.confirm) return setError('Las contraseñas nuevas no coinciden.');

    setSaving(true);
    const result = await changePassword(form.current, form.next);
    if (!result.success) {
      setSaving(false);
      return setError(result.error ?? 'No se pudo cambiar la contraseña.');
    }
    // Por seguridad se cierran todas las sesiones, incluida esta
    await signOut({ redirectTo: '/iniciar-sesion?reason=password_changed' });
  };

  const type = show ? 'text' : 'password';

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><KeyRound className="size-5 text-[color:var(--accent)]" aria-hidden /> Contraseña</h2>
        <p className="text-sm text-[color:var(--muted-foreground)]">Al menos 8 caracteres con letras y números. Al cambiarla se cerrarán tus sesiones abiertas.</p>
      </div>
      {mustChangePassword && <Notice tone="warning">Tu cuenta tiene una contraseña temporal asignada por un administrador. Cámbiala ahora.</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="grid gap-4 sm:max-w-md">
        <Field label="Contraseña actual" htmlFor="pwd-current" required>
          <Input id="pwd-current" type={type} autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <Field label="Nueva contraseña" htmlFor="pwd-new" required>
          <Input id="pwd-new" type={type} autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} maxLength={128} />
        </Field>
        <Field label="Confirmar nueva contraseña" htmlFor="pwd-confirm" required>
          <Input id="pwd-confirm" type={type} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <button type="button" onClick={() => setShow((value) => !value)} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {show ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>
      </div>
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="animate-spin" aria-hidden />} Cambiar contraseña
      </Button>
    </form>
  );
}
