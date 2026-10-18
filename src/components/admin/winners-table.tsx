'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Download, Loader2, Mail, MessageSquare, Phone, PhoneCall, Search, Trophy, X } from 'lucide-react';
import { markWinnerContacted, markWinnerDelivered, setWinnerTestimonial } from '../../lib/actions/admin';
import { uploadFile } from '../../lib/upload-client';
import { useToast } from '../../hooks/use-toast';
import { WINNER_STATUS, formatDateTime } from '../../lib/raffle/labels';
import { downloadCsv, toCsv } from '../../lib/csv';
import { Badge, Button, Card, EmptyState, Field, SectionHeader, inputStyles } from '../ui/kit';
import { cn } from '../../lib/utils';

type Winner = {
  id: string;
  prize_position: number | null;
  status: string;
  contact_attempts: number | null;
  contacted_at: string | null;
  delivered_at: string | null;
  delivery_photo_url: string | null;
  notes: string | null;
  testimonial: string | null;
  created_at: string;
  raffles: { id: string; title: string; draw_date: string | null };
  profiles: { full_name: string | null; email: string | null; phone_number: string | null };
  raffle_entries?: { ticket_number: string } | null;
};

type Action = 'contacted' | 'delivered' | 'testimonial';

/** Seguimiento de ganadores: contacto, entrega con foto y testimonio autorizado */
export function WinnersTable({ winners }: { winners: Winner[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending_contact');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Winner | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [notes, setNotes] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(Object.keys(WINNER_STATUS).map((status) => [status, winners.filter((winner) => winner.status === status).length])),
    [winners],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return winners.filter(
      (winner) =>
        (statusFilter === 'all' || winner.status === statusFilter) &&
        (!term || [winner.profiles.full_name, winner.profiles.email, winner.raffles.title, winner.raffle_entries?.ticket_number].some((value) => value?.toLowerCase().includes(term))),
    );
  }, [winners, statusFilter, search]);

  const openAction = (winner: Winner, next: Action) => {
    setSelected(winner);
    setAction(next);
    setNotes(winner.notes ?? '');
    setTestimonial(winner.testimonial ?? '');
    setPhoto(null);
  };

  const submit = async () => {
    if (!selected || !action) return;
    setBusy(true);
    try {
      let result: { error: string | null };
      if (action === 'contacted') {
        result = await markWinnerContacted(selected.id, notes || null);
      } else if (action === 'delivered') {
        const photoUrl = photo ? await uploadFile(photo, 'winners-photos') : selected.delivery_photo_url;
        result = await markWinnerDelivered(selected.id, notes || null, photoUrl);
      } else {
        result = await setWinnerTestimonial(selected.id, testimonial);
      }
      if (result.error) {
        showToast({ type: 'error', description: result.error });
        return;
      }
      showToast({ type: 'success', description: 'Seguimiento actualizado.' });
      setAction(null);
      setSelected(null);
      router.refresh();
    } catch (error) {
      showToast({ type: 'error', description: error instanceof Error ? error.message : 'No se pudo guardar.' });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `ganadores_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['Sorteo', 'Puesto', 'Boleto', 'Ganador', 'Correo', 'Teléfono', 'Estado', 'Intentos', 'Contactado', 'Entregado'],
        visible.map((winner) => [
          winner.raffles.title,
          winner.prize_position,
          winner.raffle_entries?.ticket_number,
          winner.profiles.full_name,
          winner.profiles.email,
          winner.profiles.phone_number,
          WINNER_STATUS[winner.status]?.label ?? winner.status,
          winner.contact_attempts,
          winner.contacted_at ? formatDateTime(winner.contacted_at) : '',
          winner.delivered_at ? formatDateTime(winner.delivered_at) : '',
        ]),
      ),
    );

  const tabs = [
    { value: 'pending_contact', label: `Por contactar (${counts.pending_contact ?? 0})` },
    { value: 'contacted', label: `Contactados (${counts.contacted ?? 0})` },
    { value: 'prize_delivered', label: `Entregados (${counts.prize_delivered ?? 0})` },
    { value: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        title="Ganadores"
        description="Contacta a cada ganador, registra la entrega con foto y, si lo autoriza, su testimonio."
        action={<Button variant="secondary" onClick={exportCsv}><Download aria-hidden /> Exportar CSV</Button>}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn('rounded-xl px-4 py-2 text-sm font-semibold', statusFilter === tab.value ? 'bg-[color:var(--foreground)] text-[color:var(--background)]' : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">Buscar ganadores</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, correo, sorteo o boleto" className={`${inputStyles} pl-10`} />
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Trophy} title="No hay ganadores en esta vista" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((winner) => {
            const status = WINNER_STATUS[winner.status] ?? WINNER_STATUS.pending_contact;
            return (
              <Card key={winner.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[color:var(--muted-foreground)]">{winner.raffles.title}</p>
                    <p className="font-bold">{winner.prize_position}° lugar · {winner.profiles.full_name}</p>
                    <p className="font-mono text-sm text-[color:var(--muted-foreground)]">Boleto #{winner.raffle_entries?.ticket_number ?? '—'}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  {winner.profiles.phone_number && (
                    <a href={`tel:${winner.profiles.phone_number.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-[color:var(--accent)]"><Phone className="size-4" aria-hidden /> {winner.profiles.phone_number}</a>
                  )}
                  {winner.profiles.email && (
                    <a href={`mailto:${winner.profiles.email}`} className="inline-flex items-center gap-2 break-all hover:text-[color:var(--accent)]"><Mail className="size-4 shrink-0" aria-hidden /> {winner.profiles.email}</a>
                  )}
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {winner.contact_attempts ?? 0} intento(s) de contacto
                    {winner.contacted_at && ` · contactado ${formatDateTime(winner.contacted_at)}`}
                    {winner.delivered_at && ` · entregado ${formatDateTime(winner.delivered_at)}`}
                  </p>
                  {winner.notes && <p className="rounded-lg bg-[color:var(--muted)] p-2 text-xs">{winner.notes}</p>}
                </div>
                {winner.delivery_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={winner.delivery_photo_url} alt={`Entrega del premio a ${winner.profiles.full_name}`} className="h-40 w-full rounded-xl object-cover" />
                )}
                <div className="mt-auto flex flex-wrap gap-1 border-t border-[color:var(--border)] pt-3">
                  {winner.status !== 'prize_delivered' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openAction(winner, 'contacted')}><PhoneCall aria-hidden /> Registrar contacto</Button>
                      <Button size="sm" variant="ghost" onClick={() => openAction(winner, 'delivered')}><CheckCircle2 aria-hidden /> Marcar entregado</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openAction(winner, 'testimonial')}><MessageSquare aria-hidden /> Testimonio</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected && action && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => !busy && setAction(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="winner-dialog-title" className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-[color:var(--background)] p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 id="winner-dialog-title" className="text-lg font-bold">
                {action === 'contacted' ? 'Registrar contacto' : action === 'delivered' ? 'Registrar entrega' : 'Testimonio del ganador'}
              </h2>
              <button type="button" onClick={() => setAction(null)} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar"><X className="size-5" aria-hidden /></button>
            </div>
            <p className="text-sm text-[color:var(--muted-foreground)]">{selected.profiles.full_name} · {selected.raffles.title}</p>

            {action === 'testimonial' ? (
              <Field label="Testimonio (solo con autorización del ganador)" htmlFor="w-testimonial" hint="Se muestra en la página pública. Déjalo vacío para quitarlo.">
                <textarea id="w-testimonial" rows={4} maxLength={600} className={inputStyles} value={testimonial} onChange={(e) => setTestimonial(e.target.value)} />
              </Field>
            ) : (
              <Field label="Notas internas" htmlFor="w-notes">
                <textarea id="w-notes" rows={3} maxLength={1000} className={inputStyles} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={action === 'contacted' ? 'Ej.: confirmó datos, entrega el viernes' : 'Ej.: entregado en oficina, verificó cédula'} />
              </Field>
            )}

            {action === 'delivered' && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[color:var(--border-strong)] p-4 text-sm hover:border-[color:var(--accent)]">
                <Camera className="size-5 text-[color:var(--accent)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{photo ? photo.name : 'Foto de la entrega (opcional, con autorización)'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAction(null)} disabled={busy}>Cancelar</Button>
              <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" aria-hidden />} Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
