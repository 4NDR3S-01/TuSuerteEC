'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ImageUp, Landmark, Loader2, Pencil, Plus, Power, QrCode, Trash2, X } from 'lucide-react';
import { createPaymentMethod, deletePaymentMethod, setPaymentMethodActive, updatePaymentMethod } from '../../lib/actions/admin';
import { uploadFile } from '../../lib/upload-client';
import { useToast } from '../../hooks/use-toast';
import type { PaymentMethod, PaymentMethodType, PaymentScope } from '../../lib/payments/types';
import { Badge, Button, Card, EmptyState, Field, Input, Notice, SectionHeader, inputStyles } from '../ui/kit';
import { cn } from '../../lib/utils';

type FormState = {
  name: string;
  description: string;
  type: PaymentMethodType;
  is_active: boolean;
  scopes: PaymentScope[];
  manual: { bankName: string; accountType: string; accountNumber: string; beneficiary: string; identification: string; instructions: string; requiresProof: boolean };
  qr: { provider: string; qrImageUrl: string; accountId: string; accountName: string; instructions: string; requiresProof: boolean };
};

const EMPTY: FormState = {
  name: '',
  description: '',
  type: 'manual_transfer',
  is_active: true,
  scopes: ['raffles', 'plans'],
  manual: { bankName: '', accountType: 'Ahorros', accountNumber: '', beneficiary: '', identification: '', instructions: 'Transfiere el valor exacto y sube la foto del comprobante.', requiresProof: true },
  qr: { provider: '', qrImageUrl: '', accountId: '', accountName: '', instructions: 'Escanea el código, paga el valor exacto y sube la captura del comprobante.', requiresProof: true },
};

function toForm(method: PaymentMethod): FormState {
  const config = method.config ?? {};
  const manual = config.manual ?? {};
  const qr = config.qr ?? {};
  return {
    name: method.name,
    description: method.description ?? '',
    type: method.type,
    is_active: method.is_active,
    scopes: config.scopes?.length ? config.scopes : ['raffles'],
    manual: {
      bankName: manual.bankName ?? '',
      accountType: manual.accountType ?? 'Ahorros',
      accountNumber: manual.accountNumber ?? '',
      beneficiary: manual.beneficiary ?? '',
      identification: manual.identification ?? '',
      instructions: manual.instructions ?? '',
      requiresProof: manual.requiresProof !== false,
    },
    qr: {
      provider: qr.provider ?? '',
      qrImageUrl: qr.qrImageUrl ?? '',
      accountId: qr.accountId ?? '',
      accountName: qr.accountName ?? '',
      instructions: qr.instructions ?? '',
      requiresProof: qr.requiresProof !== false,
    },
  };
}

export default function PaymentMethodsManagement({ initialMethods }: { initialMethods: PaymentMethod[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<PaymentMethod | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PaymentMethod | null>(null);

  const open = (method: PaymentMethod | 'new') => {
    setEditing(method);
    setForm(method === 'new' ? EMPTY : toForm(method));
    setError(null);
  };

  const setManual = (key: keyof FormState['manual'], value: string | boolean) => setForm((prev) => ({ ...prev, manual: { ...prev.manual, [key]: value } }));
  const setQr = (key: keyof FormState['qr'], value: string | boolean) => setForm((prev) => ({ ...prev, qr: { ...prev.qr, [key]: value } }));
  const toggleScope = (scope: PaymentScope) =>
    setForm((prev) => ({ ...prev, scopes: prev.scopes.includes(scope) ? prev.scopes.filter((s) => s !== scope) : [...prev.scopes, scope] }));

  const uploadQr = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setQr('qrImageUrl', await uploadFile(file, 'payment-qr-codes'));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (form.scopes.length === 0) return setError('Elige si el método sirve para boletos, planes o ambos.');
    setBusy('save');
    setError(null);
    const input = {
      name: form.name,
      description: form.description || null,
      icon: null,
      type: form.type,
      is_active: form.is_active,
      instructions: null,
      config: {
        scopes: form.scopes,
        currency: 'USD',
        ...(form.type === 'manual_transfer' ? { manual: form.manual } : { qr: { ...form.qr, qrImageUrl: form.qr.qrImageUrl || undefined } }),
      },
    };
    const editingMethod = editing && editing !== 'new' ? editing : null;
    const result = editingMethod ? await updatePaymentMethod(editingMethod.id, input) : await createPaymentMethod(input);
    setBusy(null);
    if (result.error) return setError(result.error);
    showToast({ type: 'success', description: editingMethod ? 'Método actualizado.' : 'Método creado.' });
    setEditing(null);
    router.refresh();
  };

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

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        title="Métodos de pago"
        description="Cuentas y códigos QR que ven los participantes al pagar. Los cambios quedan en la auditoría."
        action={<Button onClick={() => open('new')}><Plus aria-hidden /> Nuevo método</Button>}
      />

      {initialMethods.length === 0 ? (
        <EmptyState icon={CreditCard} title="No hay métodos de pago" description="Agrega al menos una cuenta bancaria o un código QR para recibir pagos." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {initialMethods.map((method) => {
            const config = method.config ?? {};
            const Icon = method.type === 'qr_code' ? QrCode : Landmark;
            return (
              <Card key={method.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]"><Icon className="size-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{method.name}</p>
                      <Badge tone={method.is_active ? 'success' : 'neutral'}>{method.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {method.type === 'qr_code' ? 'Código QR' : 'Transferencia'} · {(config.scopes ?? []).map((scope) => (scope === 'plans' ? 'planes' : 'boletos')).join(' y ') || 'sin uso asignado'}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 flex-1 space-y-1 text-sm">
                  {method.type === 'manual_transfer' ? (
                    <>
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--muted-foreground)]">Banco</dt><dd className="text-right font-medium">{config.manual?.bankName || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--muted-foreground)]">Cuenta</dt><dd className="break-all text-right font-medium">{config.manual?.accountType} {config.manual?.accountNumber || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--muted-foreground)]">Beneficiario</dt><dd className="text-right font-medium">{config.manual?.beneficiary || '—'}</dd></div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      {config.qr?.qrImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={config.qr.qrImageUrl} alt="Código QR" className="size-20 rounded-lg border border-[color:var(--border)] bg-white object-contain p-1" />
                      ) : (
                        <span className="text-[color:var(--warning)]">Falta la imagen del QR</span>
                      )}
                      <span className="text-[color:var(--muted-foreground)]">{config.qr?.provider} {config.qr?.accountName}</span>
                    </div>
                  )}
                </dl>
                <div className="mt-4 flex flex-wrap gap-1 border-t border-[color:var(--border)] pt-3">
                  <Button size="sm" variant="ghost" onClick={() => open(method)}><Pencil aria-hidden /> Editar</Button>
                  <Button size="sm" variant="ghost" disabled={busy === method.id} onClick={() => run(method.id, () => setPaymentMethodActive(method.id, !method.is_active), method.is_active ? 'Método desactivado.' : 'Método activado.')}>
                    <Power aria-hidden /> {method.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(method)} aria-label={`Eliminar ${method.name}`}><Trash2 aria-hidden /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="pm-delete-title" className="w-full max-w-md space-y-4 rounded-2xl bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 id="pm-delete-title" className="text-lg font-bold">Eliminar {confirmDelete.name}</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">Solo se eliminan métodos sin pagos registrados. Si ya se usó, desactívalo.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" disabled={busy === 'delete'} onClick={async () => { if (await run('delete', () => deletePaymentMethod(confirmDelete.id), 'Método eliminado.')) setConfirmDelete(null); }}>
                {busy === 'delete' && <Loader2 className="animate-spin" aria-hidden />} Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" onClick={() => busy !== 'save' && setEditing(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="pm-form-title" className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--background)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="pm-form-title" className="text-xl font-bold">{editing === 'new' ? 'Nuevo método de pago' : 'Editar método de pago'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar"><X className="size-5" aria-hidden /></button>
            </div>
            {error && <Notice tone="danger" className="mt-4">{error}</Notice>}

            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de método">
                {([['manual_transfer', 'Transferencia', Landmark], ['qr_code', 'Código QR', QrCode]] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.type === value}
                    onClick={() => setForm({ ...form, type: value })}
                    className={cn('flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold', form.type === value ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)]')}
                  >
                    <Icon className="size-4" aria-hidden /> {label}
                  </button>
                ))}
              </div>

              <Field label="Nombre visible" htmlFor="pm-name" required>
                <Input id="pm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej.: Transferencia Banco Pichincha" maxLength={80} />
              </Field>
              <Field label="Descripción" htmlFor="pm-desc">
                <Input id="pm-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} />
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Se puede usar para</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.scopes.includes('raffles')} onChange={() => toggleScope('raffles')} className="size-4 accent-[color:var(--accent)]" /> Boletos de sorteos</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.scopes.includes('plans')} onChange={() => toggleScope('plans')} className="size-4 accent-[color:var(--accent)]" /> Planes</label>
                </div>
              </fieldset>

              {form.type === 'manual_transfer' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Banco" htmlFor="pm-bank" required><Input id="pm-bank" value={form.manual.bankName} onChange={(e) => setManual('bankName', e.target.value)} /></Field>
                  <Field label="Tipo de cuenta" htmlFor="pm-acctype">
                    <select id="pm-acctype" className={inputStyles} value={form.manual.accountType} onChange={(e) => setManual('accountType', e.target.value)}>
                      <option>Ahorros</option>
                      <option>Corriente</option>
                    </select>
                  </Field>
                  <Field label="Número de cuenta" htmlFor="pm-accnum" required><Input id="pm-accnum" value={form.manual.accountNumber} onChange={(e) => setManual('accountNumber', e.target.value)} maxLength={40} /></Field>
                  <Field label="Cédula o RUC del titular" htmlFor="pm-ident"><Input id="pm-ident" value={form.manual.identification} onChange={(e) => setManual('identification', e.target.value)} maxLength={20} /></Field>
                  <div className="sm:col-span-2"><Field label="Beneficiario" htmlFor="pm-benef" required><Input id="pm-benef" value={form.manual.beneficiary} onChange={(e) => setManual('beneficiary', e.target.value)} /></Field></div>
                  <div className="sm:col-span-2">
                    <Field label="Instrucciones para el participante" htmlFor="pm-minst">
                      <textarea id="pm-minst" rows={3} className={inputStyles} value={form.manual.instructions} onChange={(e) => setManual('instructions', e.target.value)} maxLength={1000} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.manual.requiresProof} onChange={(e) => setManual('requiresProof', e.target.checked)} className="size-4 accent-[color:var(--accent)]" /> Exigir foto o PDF del comprobante</label>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Proveedor" htmlFor="pm-provider" hint="Ej.: Deuna, Payphone"><Input id="pm-provider" value={form.qr.provider} onChange={(e) => setQr('provider', e.target.value)} maxLength={60} /></Field>
                  <Field label="Titular" htmlFor="pm-qrname"><Input id="pm-qrname" value={form.qr.accountName} onChange={(e) => setQr('accountName', e.target.value)} /></Field>
                  <div className="sm:col-span-2"><Field label="Identificador de la cuenta" htmlFor="pm-qrid" hint="Opcional"><Input id="pm-qrid" value={form.qr.accountId} onChange={(e) => setQr('accountId', e.target.value)} maxLength={80} /></Field></div>
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-sm font-semibold">Imagen del código QR</p>
                    <div className="flex items-center gap-3">
                      {form.qr.qrImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.qr.qrImageUrl} alt="Código QR" className="size-24 rounded-lg border border-[color:var(--border)] bg-white object-contain p-1" />
                      )}
                      <label className={cn('inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border-strong)] px-4 py-2 text-sm font-semibold', uploading && 'opacity-60')}>
                        {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImageUp className="size-4" aria-hidden />}
                        {form.qr.qrImageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => uploadQr(e.target.files?.[0])} />
                      </label>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Instrucciones para el participante" htmlFor="pm-qinst">
                      <textarea id="pm-qinst" rows={3} className={inputStyles} value={form.qr.instructions} onChange={(e) => setQr('instructions', e.target.value)} maxLength={1000} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.qr.requiresProof} onChange={(e) => setQr('requiresProof', e.target.checked)} className="size-4 accent-[color:var(--accent)]" /> Exigir captura del comprobante</label>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 accent-[color:var(--accent)]" /> Método activo</label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save} disabled={busy === 'save' || uploading}>{busy === 'save' && <Loader2 className="animate-spin" aria-hidden />} Guardar</Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
