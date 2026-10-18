'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Check, Circle, Eye, EyeOff, Gift, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { getEcuadorianIdError } from '../../lib/validators/ecuador-id';
import { checkEmailExists, checkIdNumberExists, getEcuadorLocations, registerUser } from '../../lib/actions/auth';
import { Button, Card, Field, Input, Notice, inputStyles } from '../ui/kit';
import { cn } from '../../lib/utils';

type FormState = {
  fullName: string;
  idNumber: string;
  phone: string;
  cityId: string;
  parishId: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type CityOption = { id: number; name: string; parishes: Array<{ id: number; name: string }> };

type Errors = Partial<Record<keyof FormState | 'form', string>>;

type RegisterFormProps = {
  referralCode?: string | null;
  redirectTo?: string;
};

const PHONE_PREFIX = '+593';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordChecks(password: string) {
  return [
    { ok: password.length >= 8, label: 'Al menos 8 caracteres' },
    { ok: /[A-Za-z]/.test(password), label: 'Una letra' },
    { ok: /\d/.test(password), label: 'Un número' },
  ];
}

export function RegisterForm({ referralCode, redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    fullName: '',
    idNumber: '',
    phone: '',
    cityId: '',
    parishId: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [cities, setCities] = useState<CityOption[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  useEffect(() => {
    getEcuadorLocations()
      .then(setCities)
      .catch(() => setLocationsError('No se pudieron cargar las ciudades. Recarga la página.'));
  }, []);

  const parishes = useMemo(() => cities.find((city) => String(city.id) === form.cityId)?.parishes ?? [], [cities, form.cityId]);
  const checks = passwordChecks(form.password);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  const onIdNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 10);
    setField('idNumber', value);
    if (value.length === 10) {
      const formatError = getEcuadorianIdError(value);
      if (formatError) {
        setErrors((prev) => ({ ...prev, idNumber: formatError }));
      } else {
        checkIdNumberExists(value).then((exists) => {
          if (exists) setErrors((prev) => ({ ...prev, idNumber: 'Esta cédula ya tiene una cuenta. Inicia sesión o recupera tu contraseña.' }));
        });
      }
    }
  };

  const onEmail = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setField('email', value);
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (EMAIL_PATTERN.test(value.trim())) {
      emailTimer.current = setTimeout(() => {
        checkEmailExists(value).then((exists) => {
          if (exists) setErrors((prev) => ({ ...prev, email: 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.' }));
        });
      }, 500);
    }
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (form.fullName.trim().split(/\s+/).length < 2) next.fullName = 'Escribe tu nombre y apellido, como en tu cédula.';
    const idError = form.idNumber.length === 10 ? getEcuadorianIdError(form.idNumber) : 'La cédula tiene 10 dígitos.';
    if (idError) next.idNumber = idError;
    if (form.phone.length !== 9) next.phone = 'Ingresa los 9 dígitos de tu celular (sin el 0 inicial).';
    if (!form.cityId) next.cityId = 'Selecciona tu ciudad.';
    if (!form.parishId) next.parishId = 'Selecciona tu parroquia.';
    if (!form.address.trim()) next.address = 'Ingresa tu dirección para la entrega de premios.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Ingresa un correo válido.';
    if (!checks.every((check) => check.ok)) next.password = 'La contraseña no cumple los requisitos.';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden.';
    if (!form.acceptTerms) next.acceptTerms = 'Debes aceptar para crear tu cuenta.';
    // Conservar los errores de duplicado detectados al escribir
    if (errors.email && !next.email) next.email = errors.email;
    if (errors.idNumber && !next.idNumber) next.idNumber = errors.idNumber;
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      const firstField = Object.keys(found)[0];
      document.getElementById(`reg-${firstField}`)?.focus();
      return;
    }

    setSubmitting(true);
    const result = await registerUser({
      fullName: form.fullName,
      idNumber: form.idNumber,
      phoneNumber: `${PHONE_PREFIX}${form.phone}`,
      cityId: Number(form.cityId),
      parishId: Number(form.parishId),
      address: form.address,
      email: form.email,
      password: form.password,
      acceptTerms: form.acceptTerms,
      referralCode: referralCode ?? null,
    });

    if (!result.success) {
      setErrors({ form: result.error });
      setSubmitting(false);
      return;
    }

    // Iniciar sesión directamente para no hacer que la persona escriba sus datos otra vez
    const login = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
    if (!login || login.error) {
      router.replace('/iniciar-sesion?reason=registered');
      return;
    }

    showToast({ type: 'success', description: 'Tu cuenta está lista. ¡Bienvenido a TuSuerte!' });
    router.replace(redirectTo ?? '/app');
    router.refresh();
  };

  const fieldProps = (field: keyof FormState) => ({
    id: `reg-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `reg-${field}-error` : undefined,
  });

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} method="post" noValidate className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Crea tu cuenta</h2>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Usamos estos datos para verificar tu identidad y entregarte el premio si ganas.
          </p>
        </div>

        {referralCode && (
          <Notice tone="success" icon={Gift}>
            Te invitó un amigo con el código <strong>{referralCode}</strong>.
          </Notice>
        )}
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        {locationsError && <Notice tone="warning">{locationsError}</Notice>}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">Datos personales</legend>
          <div className="sm:col-span-2">
            <Field label="Nombre completo" htmlFor="reg-fullName" error={errors.fullName} required>
              <Input {...fieldProps('fullName')} autoComplete="name" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} maxLength={120} />
            </Field>
          </div>
          <Field label="Cédula" htmlFor="reg-idNumber" error={errors.idNumber} hint="10 dígitos" required>
            <Input {...fieldProps('idNumber')} inputMode="numeric" value={form.idNumber} onChange={onIdNumber} />
          </Field>
          <Field label="Celular" htmlFor="reg-phone" error={errors.phone} hint="Te contactaremos aquí si ganas" required>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-[color:var(--border-strong)] bg-[color:var(--muted)] px-3 text-sm text-[color:var(--muted-foreground)]">
                {PHONE_PREFIX}
              </span>
              <Input
                {...fieldProps('phone')}
                inputMode="numeric"
                autoComplete="tel-national"
                className="rounded-l-none"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 9))}
                placeholder="991234567"
              />
            </div>
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">Ubicación</legend>
          <Field label="Ciudad" htmlFor="reg-cityId" error={errors.cityId} required>
            <select
              {...fieldProps('cityId')}
              className={inputStyles}
              value={form.cityId}
              onChange={(e) => {
                setField('cityId', e.target.value);
                setField('parishId', '');
              }}
            >
              <option value="">Selecciona</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Parroquia" htmlFor="reg-parishId" error={errors.parishId} required>
            <select {...fieldProps('parishId')} className={inputStyles} value={form.parishId} onChange={(e) => setField('parishId', e.target.value)} disabled={!form.cityId}>
              <option value="">{form.cityId ? 'Selecciona' : 'Primero elige la ciudad'}</option>
              {parishes.map((parish) => (
                <option key={parish.id} value={parish.id}>{parish.name}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección" htmlFor="reg-address" error={errors.address} required>
              <Input {...fieldProps('address')} autoComplete="street-address" value={form.address} onChange={(e) => setField('address', e.target.value)} maxLength={250} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">Acceso</legend>
          <div className="sm:col-span-2">
            <Field label="Correo electrónico" htmlFor="reg-email" error={errors.email} required>
              <Input {...fieldProps('email')} type="email" autoComplete="email" value={form.email} onChange={onEmail} />
            </Field>
          </div>
          <Field label="Contraseña" htmlFor="reg-password" error={errors.password} required>
            <div className="relative">
              <Input
                {...fieldProps('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-12"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                maxLength={128}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-2 my-auto flex size-9 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar contraseña" htmlFor="reg-confirmPassword" error={errors.confirmPassword} required>
            <Input
              {...fieldProps('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
            />
          </Field>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:col-span-2" aria-label="Requisitos de la contraseña">
            {checks.map((check) => (
              <li key={check.label} className={cn(check.ok ? 'text-[color:var(--success)]' : 'text-[color:var(--muted-foreground)]')}>
                <span className="inline-flex items-center gap-1">{check.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-2" aria-hidden />} {check.label}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="reg-acceptTerms" className="flex items-start gap-3 text-sm text-[color:var(--muted-foreground)]">
            <input
              id="reg-acceptTerms"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setField('acceptTerms', e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[color:var(--accent)]"
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby={errors.acceptTerms ? 'reg-acceptTerms-error' : undefined}
            />
            <span>
              Declaro que soy mayor de 18 años y acepto los{' '}
              <Link href="/terminos" target="_blank" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">términos y condiciones</Link>, las{' '}
              <Link href="/bases" target="_blank" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">bases de los sorteos</Link> y la{' '}
              <Link href="/privacidad" target="_blank" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">política de privacidad</Link>.
            </span>
          </label>
          {errors.acceptTerms && (
            <p id="reg-acceptTerms-error" role="alert" className="text-xs font-medium text-[color:var(--danger)]">{errors.acceptTerms}</p>
          )}
        </div>

        <Button type="submit" size="lg" block disabled={submitting || !ready}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? 'Creando tu cuenta…' : 'Crear cuenta'}
        </Button>

        <p className="text-center text-sm text-[color:var(--muted-foreground)]">
          ¿Ya tienes cuenta?{' '}
          <Link href={redirectTo ? `/iniciar-sesion?redirectTo=${encodeURIComponent(redirectTo)}` : '/iniciar-sesion'} className="font-semibold text-[color:var(--accent)] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </Card>
  );
}
