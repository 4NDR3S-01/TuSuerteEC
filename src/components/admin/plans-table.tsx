'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Gem, Loader2, Pencil, Plus, Power, Star, Trash2, X } from 'lucide-react';
import { createPlan, deletePlan, duplicatePlan, setPlanActive, setPlanFeatured, updatePlan, type PlanInput } from '../../lib/actions/admin';
import { useToast } from '../../hooks/use-toast';
import { formatPrice } from '../../lib/raffle/labels';
import { Badge, Button, Card, EmptyState, Field, Input, Notice, SectionHeader, inputStyles } from '../ui/kit';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  benefits: unknown;
  max_concurrent_raffles: number | null;
  show_raffles_limit: boolean;
  raffles_limit_message: string | null;
  is_active: boolean;
  is_featured: boolean;
  _count?: { subscriptions: number };
};

type FormState = { name: string; description: string; price: string; interval: string; benefits: string; max_concurrent_raffles: string; is_active: boolean };

const EMPTY: FormState = { name: '', description: '', price: '', interval: 'month', benefits: '', max_concurrent_raffles: '', is_active: true };

function toForm(plan: Plan): FormState {
  return {
    name: plan.name,
    description: plan.description ?? '',
    price: String(plan.price),
    interval: plan.interval,
    benefits: Array.isArray(plan.benefits) ? (plan.benefits as string[]).join('\n') : '',
    max_concurrent_raffles: plan.max_concurrent_raffles ? String(plan.max_concurrent_raffles) : '',
    is_active: plan.is_active,
  };
}

function toInput(form: FormState): PlanInput {
  return {
    name: form.name,
    description: form.description || null,
    price: Number(form.price),
    currency: 'USD',
    interval: form.interval,
    benefits: form.benefits.split('\n').map((line) => line.trim()).filter(Boolean),
    max_concurrent_raffles: form.max_concurrent_raffles ? Number(form.max_concurrent_raffles) : null,
    is_active: form.is_active,
  };
}

export function PlansTable({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);

  const run = async (key: string, fn: () => Promise<{ error: string | null }>, message: string) => {
    setBusy(key);
    const result = await fn();
    setBusy(null);
    if (result.error) {
      showToast({ type: 'error', description: result.error });
      return false;
    }
    showToast({ type: 'success', description: message });
    router.refresh();
    return true;
  };

  const open = (plan: Plan | 'new') => {
    setEditing(plan);
    setForm(plan === 'new' ? EMPTY : toForm(plan));
    setError(null);
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    const editingPlan = editing && editing !== 'new' ? editing : null;
    const result = editingPlan ? await updatePlan(editingPlan.id, toInput(form)) : await createPlan(toInput(form));
    setBusy(null);
    if (result.error) return setError(result.error);
    showToast({ type: 'success', description: editingPlan ? 'Plan actualizado.' : 'Plan creado.' });
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        title="Planes"
        description="Los cambios de precio aplican a nuevas compras; las suscripciones vigentes no cambian."
        action={<Button onClick={() => open('new')}><Plus aria-hidden /> Nuevo plan</Button>}
      />

      {initialPlans.length === 0 ? (
        <EmptyState icon={Gem} title="Aún no hay planes" description="Crea un plan para que los participantes se suscriban." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialPlans.map((plan) => {
            const benefits = Array.isArray(plan.benefits) ? (plan.benefits as string[]) : [];
            return (
              <Card key={plan.id} className={`flex flex-col p-5 ${plan.is_active ? '' : 'opacity-75'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={plan.is_active ? 'success' : 'neutral'}>{plan.is_active ? 'Activo' : 'Inactivo'}</Badge>
                  {plan.is_featured && <Badge tone="accent"><Star aria-hidden /> Destacado</Badge>}
                  {plan._count && <Badge>{plan._count.subscriptions} suscripción(es)</Badge>}
                </div>
                <h2 className="mt-3 text-lg font-bold">{plan.name}</h2>
                <p className="text-2xl font-extrabold tabular-nums">
                  {formatPrice(plan.price, plan.currency)} <span className="text-sm font-normal text-[color:var(--muted-foreground)]">/ {plan.interval === 'year' ? 'año' : 'mes'}</span>
                </p>
                {plan.description && <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>}
                <ul className="mt-3 flex-1 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted-foreground)]">
                  {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                  <li>{plan.max_concurrent_raffles ? `Hasta ${plan.max_concurrent_raffles} sorteos simultáneos` : 'Sin límite de sorteos simultáneos'}</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-1 border-t border-[color:var(--border)] pt-3">
                  <Button size="sm" variant="ghost" onClick={() => open(plan)}><Pencil aria-hidden /> Editar</Button>
                  <Button size="sm" variant="ghost" disabled={busy === plan.id} onClick={() => run(plan.id, () => setPlanActive(plan.id, !plan.is_active), plan.is_active ? 'Plan desactivado.' : 'Plan activado.')}>
                    <Power aria-hidden /> {plan.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === plan.id} onClick={() => run(plan.id, () => setPlanFeatured(plan.id, !plan.is_featured), plan.is_featured ? 'Ya no es destacado.' : 'Plan destacado.')} aria-label={plan.is_featured ? 'Quitar destacado' : 'Destacar'}>
                    <Star aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === plan.id} onClick={() => run(plan.id, () => duplicatePlan(plan.id), 'Plan duplicado (inactivo).')} aria-label={`Duplicar ${plan.name}`}>
                    <Copy aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(plan)} aria-label={`Eliminar ${plan.name}`}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="plan-delete-title" className="w-full max-w-md space-y-4 rounded-2xl bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 id="plan-delete-title" className="text-lg font-bold">Eliminar {confirmDelete.name}</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">Solo se pueden eliminar planes sin suscripciones ni pagos. Si tiene historial, desactívalo.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" disabled={busy === 'delete'} onClick={async () => { if (await run('delete', () => deletePlan(confirmDelete.id), 'Plan eliminado.')) setConfirmDelete(null); }}>
                {busy === 'delete' && <Loader2 className="animate-spin" aria-hidden />} Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" onClick={() => busy !== 'save' && setEditing(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="plan-form-title" className="h-full w-full max-w-lg overflow-y-auto bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="plan-form-title" className="text-xl font-bold">{editing === 'new' ? 'Nuevo plan' : 'Editar plan'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar"><X className="size-5" aria-hidden /></button>
            </div>
            {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
            <div className="mt-5 space-y-4">
              <Field label="Nombre" htmlFor="pl-name" required>
                <Input id="pl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
              </Field>
              <Field label="Descripción" htmlFor="pl-desc">
                <Input id="pl-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Precio (USD)" htmlFor="pl-price" required>
                  <Input id="pl-price" type="number" min={0.01} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </Field>
                <Field label="Período" htmlFor="pl-interval">
                  <select id="pl-interval" className={inputStyles} value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
                    <option value="month">Mensual</option>
                    <option value="year">Anual</option>
                  </select>
                </Field>
              </div>
              <Field label="Sorteos simultáneos" htmlFor="pl-max" hint="Vacío = sin límite">
                <Input id="pl-max" type="number" min={1} value={form.max_concurrent_raffles} onChange={(e) => setForm({ ...form, max_concurrent_raffles: e.target.value })} />
              </Field>
              <Field label="Beneficios" htmlFor="pl-benefits" hint="Uno por línea. Escribe solo lo que el plan realmente incluye.">
                <textarea id="pl-benefits" rows={4} className={inputStyles} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
              </Field>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 accent-[color:var(--accent)]" />
                Disponible para suscribirse
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save} disabled={busy === 'save'}>{busy === 'save' && <Loader2 className="animate-spin" aria-hidden />} Guardar</Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
