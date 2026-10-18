'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '../../lib/actions/auth';
import { Button, Field, Input, Notice } from '../ui/kit';

export function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await requestPasswordReset(email).catch(() => ({ success: false, error: 'No pudimos procesar la solicitud. Intenta más tarde.' }));
    setIsLoading(false);

    if (!result.success) {
      setError(result.error ?? 'No pudimos procesar la solicitud. Intenta más tarde.');
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <Notice tone="success" icon={MailCheck} title="Revisa tu correo">
        Si <strong>{email}</strong> tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Vence en 1 hora.
        Si no llega en unos minutos, revisa la carpeta de spam.
      </Notice>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Correo electrónico" htmlFor="recovery-email" required>
        <Input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Button type="submit" size="lg" block disabled={isLoading}>
        {isLoading && <Loader2 className="animate-spin" aria-hidden />}
        {isLoading ? 'Enviando…' : 'Enviar enlace'}
      </Button>
    </form>
  );
}
