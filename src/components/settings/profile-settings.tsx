'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { updateMyProfile } from '../../lib/actions/profile';
import { Button, Field, Input, Notice } from '../ui/kit';

type Profile = { full_name: string; phone_number: string; id_number: string; address: string };

/** Datos personales. La cédula no se puede cambiar; cambiar el correo exige la contraseña actual. */
export function ProfileSettings({ email, profile }: { email: string; profile: Profile }) {
  const router = useRouter();
  const { update: refreshSession } = useSession();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    email,
    full_name: profile.full_name,
    phone_number: profile.phone_number,
    address: profile.address,
    current_password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; currentPassword?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);
  const emailChanged = form.email.trim().toLowerCase() !== email.toLowerCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    const result = await updateMyProfile(form);
    setSaving(false);
    if (!result.success) {
      setErrors(result.field === 'email' ? { email: result.error } : result.field === 'currentPassword' ? { currentPassword: result.error } : { form: result.error });
      return;
    }
    // El servidor vuelve a leer nombre y correo desde la base de datos
    await refreshSession({});
    setForm((prev) => ({ ...prev, current_password: '' }));
    showToast({ type: 'success', description: result.emailChanged ? 'Datos y correo actualizados. Usa el nuevo correo para iniciar sesión.' : 'Datos actualizados.' });
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Datos personales</h2>
        <p className="text-sm text-[color:var(--muted-foreground)]">Los usamos para contactarte y entregarte un premio si ganas.</p>
      </div>
      {errors.form && <Notice tone="danger">{errors.form}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre completo" htmlFor="pf-name" required>
            <Input id="pf-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={120} autoComplete="name" />
          </Field>
        </div>
        <Field label="Cédula" htmlFor="pf-id" hint="Para cambiarla, contáctanos.">
          <Input id="pf-id" value={profile.id_number} disabled />
        </Field>
        <Field label="Teléfono" htmlFor="pf-phone" required>
          <Input id="pf-phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} autoComplete="tel" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Dirección" htmlFor="pf-address">
            <Input id="pf-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={250} autoComplete="street-address" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Correo electrónico" htmlFor="pf-email" error={errors.email} required>
            <Input id="pf-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </Field>
        </div>
        {emailChanged && (
          <div className="sm:col-span-2">
            <Field label="Confirma tu contraseña para cambiar el correo" htmlFor="pf-password" error={errors.currentPassword} required>
              <Input id="pf-password" type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} autoComplete="current-password" />
            </Field>
          </div>
        )}
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />} Guardar cambios
      </Button>
    </form>
  );
}
