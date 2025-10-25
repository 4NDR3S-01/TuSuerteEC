'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

type RegisterFormState = {
  fullName: string;
  idNumber: string;
  phone: string;
  cityId: string;
  parishId: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type CityOption = {
  id: number;
  name: string;
  parishes: Array<{ id: number; name: string }>;
};

type RegisterFormProps = {
  containerClassName?: string;
};

export function RegisterForm({ containerClassName }: RegisterFormProps = {}) {
  const [form, setForm] = useState<RegisterFormState>({
    fullName: '',
    idNumber: '',
    phone: '',
    cityId: '',
    parishId: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [step, setStep] = useState<'form' | 'review' | 'completed'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const passwordStrength = useMemo(() => evaluatePasswordStrength(form.password), [form.password]);

  const PHONE_PREFIX = '+593';
  const baseContainerClass =
    'flex w-full flex-col gap-8 rounded-3xl border border-[color:var(--border)] bg-[color:var(--background)]/96 p-5 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:p-8 lg:p-12';
  const containerClass = [baseContainerClass, containerClassName].filter(Boolean).join(' ');

  useEffect(() => {
    try {
      const instance = getSupabaseBrowserClient();
      setSupabase(instance);
    } catch (clientError) {
      const msg =
        clientError instanceof Error ? clientError.message : 'No se pudo inicializar Supabase.';
      setConfigError(msg);
      showToast({
        type: 'error',
        description: msg,
      });
    }
  }, [showToast]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const loadLocations = async () => {
      setLocationsLoading(true);
      setLocationsError(null);

      const { data: country, error: countryError } = await supabase
        .from('countries')
        .select('id')
        .eq('code', 'EC')
        .single();

      if (countryError || !country) {
        if (isMounted) {
          setLocationsError('No se pudieron cargar las ciudades.');
        }
        setLocationsLoading(false);
        return;
      }

      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name, parishes:parishes ( id, name )')
        .eq('country_id', country.id)
        .order('name', { ascending: true });

      if (citiesError || !citiesData) {
        if (isMounted) {
          setLocationsError('No se pudieron cargar las ciudades.');
        }
        setLocationsLoading(false);
        return;
      }

      if (isMounted) {
        const normalized: CityOption[] = citiesData.map((item) => ({
          id: item.id,
          name: item.name,
          parishes: (item.parishes ?? []).sort((a, b) => a.name.localeCompare(b.name)),
        }));
        setCities(normalized.toSorted((a, b) => a.name.localeCompare(b.name)));
      }

      if (isMounted) {
        setLocationsLoading(false);
      }
    };

    loadLocations();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const selectedCity = useMemo(
    () => cities.find((option) => option.id.toString() === form.cityId),
    [cities, form.cityId],
  );

  const handleInputChange = (field: keyof RegisterFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      if (field === 'phone') {
        const sanitized = value.replace(/\D/g, '').slice(0, 9);
        setForm((prev) => ({ ...prev, phone: sanitized }));
        return;
      }

      if (field === 'idNumber') {
        const sanitized = value.replace(/\D/g, '').slice(0, 10);
        setForm((prev) => ({ ...prev, idNumber: sanitized }));
        return;
      }

      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, cityId: value, parishId: '' }));
  };

  const handleParishChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, parishId: event.target.value }));
  };

  const validateForm = () => {
    if (!supabase || configError) {
      return configError ?? 'Servicio de autenticación no disponible.';
    }

    if (!form.fullName.trim()) {
      return 'Ingresa tu nombre completo.';
    }

    if (form.idNumber.length !== 10) {
      return 'La cédula o identificación debe tener 10 dígitos.';
    }

    if (form.phone.length < 9) {
      return 'El número de celular debe incluir 9 dígitos sin el prefijo.';
    }

    if (!form.cityId || !form.parishId) {
      return 'Selecciona tu ciudad y parroquia.';
    }

    if (!form.address.trim()) {
      return 'Ingresa tu dirección.';
    }

    if (!form.email.trim()) {
      return 'Ingresa tu correo electrónico.';
    }

    if (form.password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (form.password !== form.confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 'form') return;

    const validationError = validateForm();
    if (validationError) {
      showToast({
        type: 'error',
        description: validationError,
      });
      setStep('form');
      return;
    }

    setMessage(null);
    setStep('review');
  };

  const handleConfirm = async () => {
    if (step !== 'review') return;

    const validationError = validateForm();
    if (validationError) {
      showToast({
        type: 'error',
        description: validationError,
      });
      setStep('form');
      return;
    }

    if (!supabase) {
      showToast({
        type: 'error',
        description: 'Servicio de autenticación no disponible.',
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // VALIDACIÓN 1: Verificar si el email ya existe
    const { data: emailExists, error: emailCheckError } = await supabase
      .rpc('check_email_exists', { user_email: form.email.toLowerCase().trim() });

    if (emailCheckError) {
      console.error('Error checking email:', emailCheckError);
      showToast({
        type: 'error',
        description: 'Error al verificar el correo. Intenta de nuevo.',
      });
      setIsLoading(false);
      return;
    }

    if (emailExists) {
      showToast({
        type: 'error',
        description: 'Este correo electrónico ya está registrado. Si ya tienes una cuenta, inicia sesión.',
      });
      setIsLoading(false);
      setStep('form');
      return;
    }

    // VALIDACIÓN 2: Verificar si la cédula ya existe
    const { data: cedulaExists, error: cedulaCheckError } = await supabase
      .rpc('check_id_number_exists', { id_num: form.idNumber });

    if (cedulaCheckError) {
      console.error('Error checking id_number:', cedulaCheckError);
      showToast({
        type: 'error',
        description: 'Error al verificar la cédula. Intenta de nuevo.',
      });
      setIsLoading(false);
      return;
    }

    if (cedulaExists) {
      showToast({
        type: 'error',
        description: 'Esta cédula ya está registrada en el sistema. Si ya tienes una cuenta, inicia sesión.',
      });
      setIsLoading(false);
      setStep('form');
      return;
    }

    const city = selectedCity;
    const parish = city?.parishes.find((p) => p.id.toString() === form.parishId);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          id_number: form.idNumber,
          phone_number: `${PHONE_PREFIX}${form.phone}`,
          city_id: form.cityId ? Number(form.cityId) : null,
          city_name: city?.name ?? null,
          parish_id: form.parishId ? Number(form.parishId) : null,
          parish_name: parish?.name ?? null,
          address: form.address,
          role: 'participant',
        },
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/iniciar-sesion` : undefined,
      },
    });

    if (signUpError) {
      console.error('SignUp error:', signUpError);
      showToast({
        type: 'error',
        description: mapSignUpError(signUpError.message),
      });
      setIsLoading(false);
      setStep('form');
      return;
    }

    // El perfil se creará automáticamente cuando el usuario confirme su email
    // Esto evita conflictos de cédula duplicada durante el registro
    if (signUpData.user) {
      console.info('Usuario registrado exitosamente. El perfil se creará al confirmar el email.');
      
      setMessage(
        signUpData.session 
          ? '¡Registro exitoso! Tu cuenta está lista.' 
          : '¡Registro exitoso! Revisa tu correo para confirmar tu cuenta y activarla.'
      );
    }

    setIsLoading(false);
    setStep('completed');

    setTimeout(() => {
      router.replace('/iniciar-sesion');
    }, 2500);
  };

  const isDisabled = isLoading || !!configError || !supabase || locationsLoading;

  if (step === 'review') {
    const city = selectedCity;
    const parish = city?.parishes.find((p) => p.id.toString() === form.parishId);

    return (
      <div className={containerClass}>
        <div className="flex w-full flex-col gap-6 ">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Confirma tus datos</h3>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Revisa la información antes de crear tu cuenta. Si necesitas corregir algo, vuelve al formulario.
            </p>
          </div>
          <dl className="grid gap-4 text-sm text-[color:var(--muted-foreground)] sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[color:var(--foreground)]">Nombre completo</dt>
              <dd>{form.fullName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[color:var(--foreground)]">Cédula / ID</dt>
              <dd>{form.idNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[color:var(--foreground)]">Correo</dt>
              <dd>{form.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[color:var(--foreground)]">Celular</dt>
              <dd>{`${PHONE_PREFIX}${form.phone}`}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[color:var(--foreground)]">Ciudad</dt>
              <dd>{city?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[color:var(--foreground)]">Parroquia</dt>
              <dd>{parish?.name ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-[color:var(--foreground)]">Dirección</dt>
              <dd>{form.address}</dd>
            </div>
          </dl>

          <p className="text-sm text-[color:var(--muted-foreground)]">
            ⚠️ Ten en cuenta que con estos datos nos pondremos en contacto contigo en caso de ser un ganador.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[color:var(--border)] px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5 sm:w-auto"
              onClick={() => {
                setStep('form');
              }}
              disabled={isLoading}
            >
              Corregir datos
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              onClick={handleConfirm}
              disabled={isLoading || !supabase}
            >
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'completed') {
    return (
      <div className={containerClass}>
        <div className="text-sm text-[color:var(--muted-foreground)]">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Registro completado</h3>
          <p>{message ?? 'Tu cuenta se creó correctamente. Revisa tu correo para confirmar la cuenta.'}</p>
          <p>
            Serás redirigido automáticamente al inicio de sesión. Si no ocurre, haz clic en{' '}
            <button
              type="button"
              className="font-semibold text-[color:var(--accent)]"
              onClick={() => router.replace('/iniciar-sesion')}
            >
              este enlace
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <form
        onSubmit={handleSubmit}
        className="grid w-full gap-6 sm:gap-7 md:grid-cols-2 lg:grid-cols-12"
      >
        <div className="min-w-0 space-y-3 sm:col-span-2 md:col-span-2 lg:col-span-12">
          <label htmlFor="fullName" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={handleInputChange('fullName')}
            placeholder="Tu nombre y apellido"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
        </div>

        <div className="min-w-0 space-y-3 sm:col-span-1 md:col-span-1 lg:col-span-6">
          <label htmlFor="register-id" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Cédula o identificación
          </label>
          <input
            id="register-id"
            type="text"
            inputMode="numeric"
            required
            value={form.idNumber}
            onChange={handleInputChange('idNumber')}
            placeholder="Ingresa 10 dígitos"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
        </div>

        <div className="min-w-0 space-y-3 sm:col-span-1 md:col-span-1 lg:col-span-6">
          <label htmlFor="register-phone" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Número de celular
          </label>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <span className="flex h-12 min-w-[4.5rem] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 text-sm font-semibold text-[color:var(--foreground)]">
              {PHONE_PREFIX}
            </span>
            <input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              required
              value={form.phone}
              onChange={handleInputChange('phone')}
              placeholder="99 999 9999"
              inputMode="numeric"
              className="w-full min-w-0 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.2)]"
            />
          </div>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Ingresa solo los 9 dígitos del celular. El prefijo {PHONE_PREFIX} se añadirá automáticamente.
          </p>
        </div>

        <div className="min-w-0 space-y-3 sm:col-span-1 md:col-span-1 lg:col-span-6">
          <label htmlFor="register-city" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Ciudad
          </label>
          <select
            id="register-city"
            required
            value={form.cityId}
            onChange={handleCityChange}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          >
            <option value="">Selecciona una ciudad</option>
            {cities.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {locationsLoading ? (
            <p className="text-xs text-[color:var(--muted-foreground)]">Cargando ciudades...</p>
          ) : null}
          {locationsError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{locationsError}</p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-3 sm:col-span-1 md:col-span-1 lg:col-span-6">
          <label htmlFor="register-parish" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Parroquia
          </label>
          <select
            id="register-parish"
            required
            value={form.parishId}
            onChange={handleParishChange}
            disabled={!selectedCity}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{selectedCity ? 'Selecciona una parroquia' : 'Elige una ciudad primero'}</option>
            {selectedCity?.parishes.map((parish) => (
              <option key={parish.id} value={parish.id}>
                {parish.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 space-y-3 sm:col-span-2 md:col-span-2 lg:col-span-12">
          <label htmlFor="register-address" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Dirección
          </label>
          <input
            id="register-address"
            type="text"
            autoComplete="street-address"
            required
            value={form.address}
            onChange={handleInputChange('address')}
            placeholder="Calle, número, referencia"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
        </div>

        <div className="min-w-0 space-y-3 sm:col-span-2 md:col-span-2 lg:col-span-12">
          <label htmlFor="register-email" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Correo electrónico
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleInputChange('email')}
            placeholder="tu@correo.com"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
          />
        </div>

        <div className="min-w-0 space-y-2 sm:col-span-1 md:col-span-1 lg:col-span-6">
          <label htmlFor="register-password" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handleInputChange('password')}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 inline-flex items-center justify-center rounded-full p-1.5 text-lg text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <span aria-hidden="true">{showPassword ? '🙈' : '👁️'}</span>
            </button>
          </div>
          {form.password ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Seguridad de la contraseña</span>
                <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[color:var(--muted)]">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${passwordStrength.score * 25}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-1 md:col-span-1 lg:col-span-6">
          <label htmlFor="register-confirm-password" className="block text-sm font-semibold text-[color:var(--foreground)]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 pr-12 text-sm outline-none transition-shadow focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 inline-flex items-center justify-center rounded-full p-1.5 text-lg text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
            >
              <span aria-hidden="true">{showConfirmPassword ? '🙈' : '👁️'}</span>
            </button>
          </div>
        </div>
        {locationsError && !cities.length ? (
          <p className="sm:col-span-2 md:col-span-2 lg:col-span-12 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
            {locationsError}
          </p>
        ) : null}

        <div className="mt-2 flex flex-col gap-3 md:col-span-2 lg:col-span-12 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isDisabled}
          >
            {isLoading ? 'Revisando...' : 'Revisar datos'}
          </button>
        </div>
      </form>
    </div>
  );
}

type PasswordStrength = {
  score: number;
  label: string;
  color: string;
};

function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Muy débil',
      color: '#ef4444',
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  score = Math.min(score, 4);

  const labels = ['Muy débil', 'Débil', 'Intermedia', 'Fuerte', 'Muy fuerte'];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#0ea5e9'];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
}

function mapSignUpError(message: string): string {
  if (/email rate limit/i.test(message) || /too many requests/i.test(message)) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo nuevamente.';
  }

  if (/password should be at least/i.test(message)) {
    return 'La contraseña debe cumplir con los requisitos mínimos de seguridad.';
  }

  if (/user already registered/i.test(message)) {
    return 'Ya existe una cuenta con este correo.';
  }

  if (/duplicate key value violates unique constraint.*profiles_id_number_key/i.test(message)) {
    return 'Esta cédula ya está registrada. Si ya tienes una cuenta, inicia sesión.';
  }

  if (/duplicate key/i.test(message) || /already exists/i.test(message)) {
    return 'Este usuario ya está registrado. Verifica tu cédula o correo electrónico.';
  }

  if (/Database error/i.test(message)) {
    return 'Error al crear el perfil. Por favor, verifica que tu cédula no esté ya registrada.';
  }

  return 'No pudimos crear tu cuenta. Intenta nuevamente en unos minutos.';
}
