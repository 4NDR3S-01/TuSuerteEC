'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Copy,
  Eye,
  Gift,
  Loader2,
  Lock,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Trophy,
  Undo2,
  X,
} from 'lucide-react';
import { createRaffle, deleteRaffle, setRaffleStatus, updateRaffle, type RaffleInput } from '../../lib/actions/admin';
import { uploadFile } from '../../lib/upload-client';
import { useToast } from '../../hooks/use-toast';
import { ENTRY_MODES, PRIZE_CATEGORIES, RAFFLE_STATUS, formatDateTime, formatPrice, prizeCategory } from '../../lib/raffle/labels';
import { fromLocalInput, toLocalInput } from '../../lib/datetime-input';
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Input, Notice, SectionHeader, inputStyles } from '../ui/kit';
import { cn } from '../../lib/utils';

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  draw_date: string | null;
  status: string;
  entry_mode: string;
  total_winners: number;
  max_entries_per_user: number | null;
  is_trending: boolean;
  ticket_price: number | null;
  terms: string | null;
  draw_commitment: string | null;
  created_at: string;
  _count: { raffle_entries: number; payment_transactions: number };
};

type FormState = {
  title: string;
  description: string;
  prize_description: string;
  prize_category: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  entry_mode: string;
  total_winners: string;
  max_entries_per_user: string;
  ticket_price: string;
  is_trending: boolean;
  terms: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  prize_description: '',
  prize_category: 'other',
  image_url: null,
  start_date: '',
  end_date: '',
  draw_date: '',
  entry_mode: 'tickets_only',
  total_winners: '1',
  max_entries_per_user: '',
  ticket_price: '',
  is_trending: false,
  terms: '',
};

function toForm(raffle: Raffle): FormState {
  return {
    title: raffle.title,
    description: raffle.description ?? '',
    prize_description: raffle.prize_description,
    prize_category: raffle.prize_category ?? 'other',
    image_url: raffle.image_url,
    start_date: toLocalInput(raffle.start_date),
    end_date: toLocalInput(raffle.end_date),
    draw_date: toLocalInput(raffle.draw_date),
    entry_mode: raffle.entry_mode,
    total_winners: String(raffle.total_winners),
    max_entries_per_user: raffle.max_entries_per_user ? String(raffle.max_entries_per_user) : '',
    ticket_price: raffle.ticket_price ? String(raffle.ticket_price) : '',
    is_trending: raffle.is_trending,
    terms: raffle.terms ?? '',
  };
}

function toInput(form: FormState): RaffleInput {
  return {
    title: form.title,
    description: form.description || null,
    prize_description: form.prize_description,
    prize_category: form.prize_category,
    image_url: form.image_url,
    start_date: fromLocalInput(form.start_date),
    end_date: fromLocalInput(form.end_date),
    draw_date: fromLocalInput(form.draw_date),
    entry_mode: form.entry_mode,
    total_winners: Number(form.total_winners),
    max_entries_per_user: form.max_entries_per_user ? Number(form.max_entries_per_user) : null,
    ticket_price: form.entry_mode === 'subscribers_only' || !form.ticket_price ? null : Number(form.ticket_price),
    is_trending: form.is_trending,
    terms: form.terms || null,
  };
}

type Confirm = { raffle: Raffle; action: 'active' | 'closed' | 'draft' | 'completed' | 'delete' } | null;

const CONFIRM_TEXT: Record<NonNullable<Confirm>['action'], { title: string; body: string; cta: string }> = {
  active: {
    title: 'Publicar sorteo',
    body: 'El sorteo será visible y aceptará participaciones. Los suscriptores activos se inscribirán automáticamente si la modalidad lo permite. Después, el premio, el precio y la modalidad quedarán bloqueados cuando haya participantes.',
    cta: 'Publicar',
  },
  closed: {
    title: 'Cerrar participación',
    body: 'Se dejarán de aceptar boletos, se fijará la lista de participantes y se publicará el compromiso de la semilla. Esta acción no se puede deshacer. Los pagos pendientes de este sorteo deberán rechazarse para su devolución.',
    cta: 'Cerrar participación',
  },
  draft: { title: 'Volver a borrador', body: 'El sorteo dejará de ser visible. Solo es posible si aún no tiene participaciones ni pagos.', cta: 'Volver a borrador' },
  completed: { title: 'Marcar como finalizado', body: 'Úsalo cuando todos los premios estén entregados. El resultado seguirá siendo público y verificable.', cta: 'Finalizar' },
  delete: { title: 'Eliminar sorteo', body: 'Solo se pueden eliminar borradores sin participaciones ni pagos. Esta acción no se puede deshacer.', cta: 'Eliminar' },
};

export function RafflesTable({ initialRaffles, openCreate = false }: { initialRaffles: Raffle[]; openCreate?: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<Raffle | 'new' | null>(openCreate ? 'new' : null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return initialRaffles.filter(
      (raffle) => (statusFilter === 'all' || raffle.status === statusFilter) && (!term || raffle.title.toLowerCase().includes(term) || raffle.prize_description.toLowerCase().includes(term)),
    );
  }, [initialRaffles, search, statusFilter]);

  const editingRaffle = editing && editing !== 'new' ? editing : null;
  const locked = Boolean(editingRaffle && (editingRaffle._count.raffle_entries > 0 || editingRaffle._count.payment_transactions > 0 || editingRaffle.status !== 'draft'));

  const openForm = (raffle: Raffle | 'new') => {
    setEditing(raffle);
    setForm(raffle === 'new' ? EMPTY_FORM : toForm(raffle));
    setFormError(null);
  };

  const duplicate = (raffle: Raffle) => {
    openForm('new');
    setForm({ ...toForm(raffle), title: `${raffle.title} (copia)`, start_date: '', end_date: '', draw_date: '' });
  };

  const save = async () => {
    setBusy(true);
    setFormError(null);
    const input = toInput(form);
    const result = editingRaffle ? await updateRaffle(editingRaffle.id, input) : await createRaffle({ ...input, status: 'draft' });
    setBusy(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    showToast({ type: 'success', description: editingRaffle ? 'Sorteo actualizado.' : 'Sorteo creado como borrador.' });
    setEditing(null);
    router.refresh();
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    const result = confirm.action === 'delete' ? await deleteRaffle(confirm.raffle.id) : await setRaffleStatus(confirm.raffle.id, confirm.action);
    setBusy(false);
    if (result.error) {
      showToast({ type: 'error', description: result.error });
      return;
    }
    showToast({ type: 'success', description: 'Listo.' });
    setConfirm(null);
    router.refresh();
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'raffle-prizes');
      setForm((prev) => ({ ...prev, image_url: url }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <SectionHeader as="h1" title="Sorteos" description="Borrador → Abierto → Cerrado (compromiso publicado) → Sorteado → Finalizado." action={<Button onClick={() => openForm('new')}><Plus aria-hidden /> Nuevo sorteo</Button>} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar sorteos</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título o premio" className={`${inputStyles} pl-10`} />
        </label>
        <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputStyles} sm:w-56`}>
          <option value="all">Todos los estados</option>
          {Object.entries(RAFFLE_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Gift} title="No hay sorteos" description="Crea tu primer sorteo como borrador y publícalo cuando esté listo." />
      ) : (
        <div className="space-y-3">
          {visible.map((raffle) => {
            const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.draft;
            const category = prizeCategory(raffle.prize_category);
            const overdue = raffle.status === 'active' && raffle.end_date && new Date(raffle.end_date) <= new Date();
            const readyToDraw = raffle.status === 'closed' && raffle.draw_date && new Date(raffle.draw_date) <= new Date();
            return (
              <Card key={raffle.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--muted)]">
                  {raffle.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={raffle.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <category.icon className="size-7 text-[color:var(--muted-foreground)]" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {overdue && <Badge tone="danger">Pasó la fecha de cierre</Badge>}
                    {readyToDraw && <Badge tone="warning">Listo para sortear</Badge>}
                    {raffle._count.payment_transactions > 0 && <Badge tone="warning">{raffle._count.payment_transactions} pago(s) pendiente(s)</Badge>}
                  </div>
                  <p className="mt-1 truncate font-semibold">{raffle.title}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {ENTRY_MODES[raffle.entry_mode]?.label} · {raffle.ticket_price ? `${formatPrice(raffle.ticket_price)} por boleto` : 'sin venta de boletos'} · {raffle._count.raffle_entries} boleto(s) · cierre {formatDateTime(raffle.end_date)} · sorteo {formatDateTime(raffle.draw_date)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {raffle.status === 'draft' && <Button size="sm" onClick={() => setConfirm({ raffle, action: 'active' })}><Play aria-hidden /> Publicar</Button>}
                  {raffle.status === 'active' && <Button size="sm" variant={overdue ? 'primary' : 'secondary'} onClick={() => setConfirm({ raffle, action: 'closed' })}><Lock aria-hidden /> Cerrar</Button>}
                  {raffle.status === 'closed' && <ButtonLink size="sm" href={`/sorteo/${raffle.id}/ejecutar`}><Trophy aria-hidden /> Ejecutar sorteo</ButtonLink>}
                  {raffle.status === 'drawn' && <Button size="sm" variant="secondary" onClick={() => setConfirm({ raffle, action: 'completed' })}><Archive aria-hidden /> Finalizar</Button>}
                  {raffle.status !== 'draft' && (
                    <ButtonLink size="sm" variant="ghost" href={raffle.status === 'active' ? `/sorteos/${raffle.id}` : `/resultados/${raffle.id}`} aria-label="Ver página pública">
                      <Eye aria-hidden />
                    </ButtonLink>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openForm(raffle)} aria-label={`Editar ${raffle.title}`}><Pencil aria-hidden /></Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(raffle)} aria-label={`Duplicar ${raffle.title}`}><Copy aria-hidden /></Button>
                  {raffle.status === 'active' && raffle._count.raffle_entries === 0 && raffle._count.payment_transactions === 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ raffle, action: 'draft' })} aria-label="Volver a borrador"><Undo2 aria-hidden /></Button>
                  )}
                  {raffle.status === 'draft' && raffle._count.raffle_entries === 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ raffle, action: 'delete' })} aria-label={`Eliminar ${raffle.title}`}><Trash2 aria-hidden /></Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setConfirm(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md space-y-4 rounded-2xl bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 id="confirm-title" className="text-lg font-bold">{CONFIRM_TEXT[confirm.action].title}</h2>
            <p className="font-semibold">{confirm.raffle.title}</p>
            <p className="text-sm text-[color:var(--muted-foreground)]">{CONFIRM_TEXT[confirm.action].body}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancelar</Button>
              <Button variant={confirm.action === 'delete' ? 'danger' : 'primary'} onClick={runConfirm} disabled={busy}>
                {busy && <Loader2 className="animate-spin" aria-hidden />} {CONFIRM_TEXT[confirm.action].cta}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" onClick={() => !busy && setEditing(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="raffle-form-title" className="h-full w-full max-w-2xl overflow-y-auto bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="raffle-form-title" className="text-xl font-bold">{editingRaffle ? 'Editar sorteo' : 'Nuevo sorteo'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar"><X className="size-5" aria-hidden /></button>
            </div>

            {locked && (
              <Notice tone="warning" icon={Lock} className="mt-4" title="Condiciones protegidas">
                Este sorteo ya tiene participantes o está publicado: no puedes cambiar el premio, el precio ni la modalidad, reducir ganadores o límites, ni adelantar fechas.
              </Notice>
            )}
            {formError && <Notice tone="danger" className="mt-4">{formError}</Notice>}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Título" htmlFor="rf-title" required>
                  <Input id="rf-title" value={form.title} onChange={(event) => set('title', event.target.value)} maxLength={120} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Premio" htmlFor="rf-prize" hint="Describe exactamente qué recibe el ganador" required>
                  <Input id="rf-prize" value={form.prize_description} onChange={(event) => set('prize_description', event.target.value)} maxLength={500} disabled={locked} />
                </Field>
              </div>
              <Field label="Categoría" htmlFor="rf-category">
                <select id="rf-category" className={inputStyles} value={form.prize_category} onChange={(event) => set('prize_category', event.target.value)} disabled={locked}>
                  {Object.entries(PRIZE_CATEGORIES).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Modalidad" htmlFor="rf-mode">
                <select id="rf-mode" className={inputStyles} value={form.entry_mode} onChange={(event) => set('entry_mode', event.target.value)} disabled={locked}>
                  {Object.entries(ENTRY_MODES).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              {form.entry_mode !== 'subscribers_only' && (
                <Field label="Precio por boleto (USD)" htmlFor="rf-price" required>
                  <Input id="rf-price" type="number" min={0.01} step="0.01" value={form.ticket_price} onChange={(event) => set('ticket_price', event.target.value)} disabled={locked} />
                </Field>
              )}
              <Field label="Cantidad de ganadores" htmlFor="rf-winners" required>
                <Input id="rf-winners" type="number" min={1} value={form.total_winners} onChange={(event) => set('total_winners', event.target.value)} disabled={editingRaffle?.status === 'closed'} />
              </Field>
              <Field label="Máximo por persona" htmlFor="rf-max" hint="Vacío = sin límite">
                <Input id="rf-max" type="number" min={1} value={form.max_entries_per_user} onChange={(event) => set('max_entries_per_user', event.target.value)} />
              </Field>
              <Field label="Abre" htmlFor="rf-start">
                <Input id="rf-start" type="datetime-local" value={form.start_date} onChange={(event) => set('start_date', event.target.value)} disabled={locked} />
              </Field>
              <Field label="Cierra la participación" htmlFor="rf-end" required>
                <Input id="rf-end" type="datetime-local" value={form.end_date} onChange={(event) => set('end_date', event.target.value)} disabled={editingRaffle?.status === 'closed'} />
              </Field>
              <Field label="Fecha del sorteo" htmlFor="rf-draw" required>
                <Input id="rf-draw" type="datetime-local" value={form.draw_date} onChange={(event) => set('draw_date', event.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descripción" htmlFor="rf-desc">
                  <textarea id="rf-desc" rows={3} className={inputStyles} value={form.description} onChange={(event) => set('description', event.target.value)} maxLength={3000} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Condiciones adicionales" htmlFor="rf-terms" hint="Se muestran en la página del sorteo, junto a las bases generales">
                  <textarea id="rf-terms" rows={4} className={inputStyles} value={form.terms} onChange={(event) => set('terms', event.target.value)} maxLength={5000} />
                </Field>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-semibold">Imagen del premio</p>
                <div className="flex items-center gap-3">
                  {form.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image_url} alt="Imagen del premio" className="size-20 rounded-xl object-cover" />
                  )}
                  <label className={cn('inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border-strong)] px-4 py-2 text-sm font-semibold', uploading && 'opacity-60')}>
                    {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                    {form.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => uploadImage(event.target.files?.[0])} disabled={uploading} />
                  </label>
                  {form.image_url && <Button variant="ghost" size="sm" onClick={() => set('image_url', null)}>Quitar</Button>}
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.is_trending} onChange={(event) => set('is_trending', event.target.checked)} className="size-4 accent-[color:var(--accent)]" />
                Mostrar como destacado en la portada
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancelar</Button>
              <Button onClick={save} disabled={busy || uploading}>{busy && <Loader2 className="animate-spin" aria-hidden />} Guardar</Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
