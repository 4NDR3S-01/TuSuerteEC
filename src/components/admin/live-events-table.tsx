'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CalendarClock, Eye, EyeOff, ExternalLink, Loader2, Pencil, Plus, Radio, Trash2, X } from 'lucide-react';
import {
  createLiveEvent,
  deleteLiveEvent,
  setLiveEventAlert,
  setLiveEventStatus,
  setLiveEventVisibility,
  updateLiveEvent,
  type LiveEventInput,
} from '../../lib/actions/admin';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime } from '../../lib/raffle/labels';
import { fromLocalInput, toLocalInput } from '../../lib/datetime-input';
import { Badge, Button, Card, EmptyState, Field, Input, Notice, SectionHeader, inputStyles } from '../ui/kit';

type LiveEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  countdown_start_at: string | null;
  stream_url: string | null;
  raffle_id: string | null;
  status: string;
  is_visible: boolean;
  show_as_alert: boolean;
  raffles?: { id: string; title: string } | null;
};

type Props = {
  initialEvents: LiveEvent[];
  totalCount?: number;
  availableRaffles: Array<{ id: string; title: string }>;
};

const STATUS: Record<string, { label: string; tone: 'info' | 'danger' | 'success' | 'neutral' }> = {
  scheduled: { label: 'Programado', tone: 'info' },
  live: { label: 'En vivo', tone: 'danger' },
  completed: { label: 'Finalizado', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
};

type FormState = { title: string; description: string; start_at: string; countdown_start_at: string; stream_url: string; raffle_id: string; is_visible: boolean };

const EMPTY: FormState = { title: '', description: '', start_at: '', countdown_start_at: '', stream_url: '', raffle_id: '', is_visible: true };

/** Eventos y transmisiones en vivo (staff y admin). Uno de ellos puede mostrarse como barra de aviso en el sitio. */
export function LiveEventsTableWrapper({ initialEvents, availableRaffles }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<LiveEvent | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LiveEvent | null>(null);

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

  const open = (event: LiveEvent | 'new') => {
    setEditing(event);
    setError(null);
    setForm(
      event === 'new'
        ? EMPTY
        : {
            title: event.title,
            description: event.description ?? '',
            start_at: toLocalInput(event.start_at),
            countdown_start_at: toLocalInput(event.countdown_start_at),
            stream_url: event.stream_url ?? '',
            raffle_id: event.raffle_id ?? '',
            is_visible: event.is_visible,
          },
    );
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    const input: LiveEventInput = {
      title: form.title,
      description: form.description || null,
      start_at: fromLocalInput(form.start_at) ?? '',
      countdown_start_at: fromLocalInput(form.countdown_start_at),
      stream_url: form.stream_url || null,
      raffle_id: form.raffle_id || null,
      is_visible: form.is_visible,
    };
    const editingEvent = editing && editing !== 'new' ? editing : null;
    const result = editingEvent ? await updateLiveEvent(editingEvent.id, input) : await createLiveEvent(input);
    setBusy(null);
    if (result.error) return setError(result.error);
    showToast({ type: 'success', description: editingEvent ? 'Evento actualizado.' : 'Evento creado.' });
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        title="Eventos en vivo"
        description="Programa transmisiones de sorteos. Activa la barra de aviso para que aparezca en todo el sitio."
        action={<Button onClick={() => open('new')}><Plus aria-hidden /> Nuevo evento</Button>}
      />

      {initialEvents.length === 0 ? (
        <EmptyState icon={Radio} title="No hay eventos" description="Crea un evento para anunciar la transmisión de un sorteo." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {initialEvents.map((event) => {
            const status = STATUS[event.status] ?? STATUS.scheduled;
            const finished = event.status === 'completed' || event.status === 'canceled';
            return (
              <Card key={event.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={status.tone}>{event.status === 'live' && <Radio aria-hidden />}{status.label}</Badge>
                  {!event.is_visible && <Badge><EyeOff aria-hidden /> Oculto</Badge>}
                  {event.show_as_alert && <Badge tone="accent"><Bell aria-hidden /> Barra de aviso</Badge>}
                </div>
                <div>
                  <p className="font-bold">{event.title}</p>
                  {event.description && <p className="text-sm text-[color:var(--muted-foreground)]">{event.description}</p>}
                </div>
                <p className="flex items-center gap-2 text-sm"><CalendarClock className="size-4 text-[color:var(--accent)]" aria-hidden /> {formatDateTime(event.start_at)}</p>
                {event.raffles && <p className="text-sm text-[color:var(--muted-foreground)]">Sorteo: {event.raffles.title}</p>}
                {event.stream_url && (
                  <a href={event.stream_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-sm font-semibold text-[color:var(--accent)] hover:underline">
                    <ExternalLink className="size-4 shrink-0" aria-hidden /> Enlace de la transmisión
                  </a>
                )}
                <div className="mt-auto flex flex-wrap gap-1 border-t border-[color:var(--border)] pt-3">
                  {event.status === 'scheduled' && (
                    <Button size="sm" variant="ghost" disabled={busy === event.id} onClick={() => run(event.id, () => setLiveEventStatus(event.id, 'live'), 'El evento está en vivo.')}><Radio aria-hidden /> Iniciar</Button>
                  )}
                  {event.status === 'live' && (
                    <Button size="sm" variant="ghost" disabled={busy === event.id} onClick={() => run(event.id, () => setLiveEventStatus(event.id, 'completed'), 'Evento finalizado.')}>Finalizar</Button>
                  )}
                  {!finished && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === event.id || !event.is_visible}
                      title={event.is_visible ? undefined : 'Haz visible el evento para usar la barra de aviso'}
                      onClick={() => run(event.id, () => setLiveEventAlert(event.id, !event.show_as_alert), event.show_as_alert ? 'Barra de aviso desactivada.' : 'Barra de aviso activada.')}
                    >
                      {event.show_as_alert ? <BellOff aria-hidden /> : <Bell aria-hidden />} {event.show_as_alert ? 'Quitar aviso' : 'Mostrar aviso'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy === event.id} onClick={() => run(event.id, () => setLiveEventVisibility(event.id, !event.is_visible), event.is_visible ? 'Evento oculto.' : 'Evento visible.')} aria-label={event.is_visible ? 'Ocultar' : 'Mostrar'}>
                    {event.is_visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => open(event)} aria-label={`Editar ${event.title}`}><Pencil aria-hidden /></Button>
                  {event.status === 'scheduled' && (
                    <Button size="sm" variant="ghost" disabled={busy === event.id} onClick={() => run(event.id, () => setLiveEventStatus(event.id, 'canceled'), 'Evento cancelado.')}>Cancelar evento</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(event)} aria-label={`Eliminar ${event.title}`}><Trash2 aria-hidden /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ev-delete-title" className="w-full max-w-md space-y-4 rounded-2xl bg-[color:var(--background)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="ev-delete-title" className="text-lg font-bold">Eliminar {confirmDelete.title}</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">El evento desaparecerá del sitio. Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" disabled={busy === 'delete'} onClick={async () => { if (await run('delete', () => deleteLiveEvent(confirmDelete.id), 'Evento eliminado.')) setConfirmDelete(null); }}>
                {busy === 'delete' && <Loader2 className="animate-spin" aria-hidden />} Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" onClick={() => busy !== 'save' && setEditing(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="ev-form-title" className="h-full w-full max-w-lg overflow-y-auto bg-[color:var(--background)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="ev-form-title" className="text-xl font-bold">{editing === 'new' ? 'Nuevo evento' : 'Editar evento'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar"><X className="size-5" aria-hidden /></button>
            </div>
            {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
            <div className="mt-5 space-y-4">
              <Field label="Título" htmlFor="ev-title" required><Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} /></Field>
              <Field label="Descripción" htmlFor="ev-desc"><textarea id="ev-desc" rows={3} className={inputStyles} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Inicio" htmlFor="ev-start" required><Input id="ev-start" type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></Field>
                <Field label="Inicio de la cuenta regresiva" htmlFor="ev-countdown" hint="Opcional; por defecto 24 h antes"><Input id="ev-countdown" type="datetime-local" value={form.countdown_start_at} onChange={(e) => setForm({ ...form, countdown_start_at: e.target.value })} /></Field>
              </div>
              <Field label="Enlace de la transmisión" htmlFor="ev-url" hint="YouTube, Facebook, Instagram…"><Input id="ev-url" type="url" value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="https://" /></Field>
              <Field label="Sorteo relacionado" htmlFor="ev-raffle">
                <select id="ev-raffle" className={inputStyles} value={form.raffle_id} onChange={(e) => setForm({ ...form, raffle_id: e.target.value })}>
                  <option value="">Ninguno</option>
                  {availableRaffles.map((raffle) => <option key={raffle.id} value={raffle.id}>{raffle.title}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="size-4 accent-[color:var(--accent)]" /> Visible en el sitio</label>
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
