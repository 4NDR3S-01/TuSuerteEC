'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Power, Tag, Trash2 } from 'lucide-react';
import { createDiscountCode, deleteDiscountCode, setDiscountCodeActive, updateReferralSettings, type DiscountCodeInput } from '../../lib/actions/admin-marketing';
import { useToast } from '../../hooks/use-toast';
import { formatDate, formatPrice } from '../../lib/raffle/labels';
import { Badge, Button, Card, EmptyState, Field, Input, inputStyles } from '../ui/kit';

type Code = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  value: number;
  applies_to: string;
  max_uses: number | null;
  max_uses_per_user: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  uses: number;
  raffle_title: string | null;
};

type Props = {
  codes: Code[];
  raffles: Array<{ id: string; title: string }>;
  settings: { enabled: boolean; percent: number; validityDays: number };
  referralStats: { referred: number; rewards: number; redeemed: number };
};

const EMPTY: DiscountCodeInput = {
  code: '',
  description: null,
  discount_type: 'percent',
  value: 10,
  applies_to: 'all',
  raffle_id: null,
  max_uses: null,
  max_uses_per_user: 1,
  valid_from: null,
  valid_until: null,
  is_active: true,
};

const SCOPES: Record<string, string> = { all: 'Boletos y planes', raffles: 'Solo boletos', plans: 'Solo planes' };

export function MarketingManagement({ codes, raffles, settings, referralStats }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<DiscountCodeInput>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [referral, setReferral] = useState(settings);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) => {
    setBusy(key);
    const result = await fn();
    setBusy(null);
    if (!result.success) return showToast({ type: 'error', description: result.error ?? 'No se pudo completar.' });
    showToast({ type: 'success', description: message });
    after?.();
    router.refresh();
  };

  const set = <K extends keyof DiscountCodeInput>(key: K, value: DiscountCodeInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Códigos de descuento</h2>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}><Plus aria-hidden /> Nuevo código</Button>
        </div>

        {showForm && (
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código" htmlFor="dc-code" hint="Letras, números, - y _. Sin espacios." required>
                <Input id="dc-code" value={form.code} onChange={(event) => set('code', event.target.value.toUpperCase())} maxLength={30} />
              </Field>
              <Field label="Descripción interna" htmlFor="dc-desc">
                <Input id="dc-desc" value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} maxLength={200} />
              </Field>
              <Field label="Tipo" htmlFor="dc-type">
                <select id="dc-type" className={inputStyles} value={form.discount_type} onChange={(event) => set('discount_type', event.target.value as 'percent' | 'fixed')}>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo (USD)</option>
                </select>
              </Field>
              <Field label={form.discount_type === 'percent' ? 'Porcentaje' : 'Monto'} htmlFor="dc-value" required>
                <Input id="dc-value" type="number" min={0.01} step="0.01" value={form.value} onChange={(event) => set('value', Number(event.target.value))} />
              </Field>
              <Field label="Aplica a" htmlFor="dc-scope">
                <select id="dc-scope" className={inputStyles} value={form.applies_to} onChange={(event) => set('applies_to', event.target.value as DiscountCodeInput['applies_to'])}>
                  {Object.entries(SCOPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Solo para el sorteo" htmlFor="dc-raffle" hint="Opcional">
                <select id="dc-raffle" className={inputStyles} value={form.raffle_id ?? ''} disabled={form.applies_to === 'plans'} onChange={(event) => set('raffle_id', event.target.value || null)}>
                  <option value="">Cualquier sorteo</option>
                  {raffles.map((raffle) => <option key={raffle.id} value={raffle.id}>{raffle.title}</option>)}
                </select>
              </Field>
              <Field label="Usos totales" htmlFor="dc-max" hint="Vacío = sin límite">
                <Input id="dc-max" type="number" min={1} value={form.max_uses ?? ''} onChange={(event) => set('max_uses', event.target.value ? Number(event.target.value) : null)} />
              </Field>
              <Field label="Usos por persona" htmlFor="dc-per-user">
                <Input id="dc-per-user" type="number" min={1} value={form.max_uses_per_user} onChange={(event) => set('max_uses_per_user', Number(event.target.value))} />
              </Field>
              <Field label="Válido desde" htmlFor="dc-from">
                <Input id="dc-from" type="datetime-local" value={form.valid_from ?? ''} onChange={(event) => set('valid_from', event.target.value || null)} />
              </Field>
              <Field label="Válido hasta" htmlFor="dc-until">
                <Input id="dc-until" type="datetime-local" value={form.valid_until ?? ''} onChange={(event) => set('valid_until', event.target.value || null)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowForm(false); setForm(EMPTY); }}>Cancelar</Button>
              <Button
                disabled={busy === 'create'}
                onClick={() =>
                  run(
                    'create',
                    () => createDiscountCode({
                      ...form,
                      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
                      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
                    }),
                    'Código creado.',
                    () => { setShowForm(false); setForm(EMPTY); },
                  )
                }
              >
                {busy === 'create' && <Loader2 className="animate-spin" aria-hidden />} Crear código
              </Button>
            </div>
          </Card>
        )}

        {codes.length === 0 ? (
          <EmptyState icon={Tag} title="Todavía no hay códigos" description="Crea un código para campañas, alianzas o fechas especiales." />
        ) : (
          <Card className="divide-y divide-[color:var(--border)]">
            {codes.map((code) => {
              const expired = code.valid_until ? new Date(code.valid_until) < new Date() : false;
              return (
                <div key={code.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-mono font-bold">
                      {code.code}
                      <Badge tone={!code.is_active ? 'neutral' : expired ? 'danger' : 'success'}>{!code.is_active ? 'Inactivo' : expired ? 'Vencido' : 'Activo'}</Badge>
                    </p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {code.discount_type === 'percent' ? `${code.value}%` : formatPrice(code.value)} · {SCOPES[code.applies_to]}
                      {code.raffle_title ? ` · ${code.raffle_title}` : ''}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {code.uses}{code.max_uses ? ` de ${code.max_uses}` : ''} usos · {code.max_uses_per_user} por persona
                      {code.valid_until ? ` · hasta el ${formatDate(code.valid_until)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" disabled={busy === code.id} onClick={() => run(code.id, () => setDiscountCodeActive(code.id, !code.is_active), code.is_active ? 'Código desactivado.' : 'Código activado.')}>
                      <Power aria-hidden /> {code.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                    {code.uses === 0 && (
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${code.code}`} disabled={busy === code.id} onClick={() => run(code.id, () => deleteDiscountCode(code.id), 'Código eliminado.')}>
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Programa de referidos</h2>
        <Card className="space-y-4 p-5">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[['Registrados', referralStats.referred], ['Recompensas', referralStats.rewards], ['Códigos usados', referralStats.redeemed]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[color:var(--muted)]/60 p-3">
                <dd className="font-display text-xl font-extrabold tabular-nums">{value}</dd>
                <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
              </div>
            ))}
          </dl>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={referral.enabled} onChange={(event) => setReferral({ ...referral, enabled: event.target.checked })} className="size-4 accent-[color:var(--accent)]" />
            Programa activo
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Descuento (%)" htmlFor="ref-percent">
              <Input id="ref-percent" type="number" min={1} max={99} value={referral.percent} onChange={(event) => setReferral({ ...referral, percent: Number(event.target.value) })} />
            </Field>
            <Field label="Vigencia (días)" htmlFor="ref-days">
              <Input id="ref-days" type="number" min={1} max={730} value={referral.validityDays} onChange={(event) => setReferral({ ...referral, validityDays: Number(event.target.value) })} />
            </Field>
          </div>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Quien invita recibe un código personal de un solo uso cuando se aprueba el primer pago de la persona invitada. Los cambios aplican a las recompensas futuras.
          </p>
          <Button block disabled={busy === 'referral'} onClick={() => run('referral', () => updateReferralSettings(referral), 'Configuración guardada.')}>
            {busy === 'referral' && <Loader2 className="animate-spin" aria-hidden />} Guardar
          </Button>
        </Card>
      </section>
    </div>
  );
}
