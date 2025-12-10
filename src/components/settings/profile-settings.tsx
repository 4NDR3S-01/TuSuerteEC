'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Mail, Lock } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

export function ProfileSettings({ user, profile }: any) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    full_name: profile?.full_name || '',
    phone_number: profile?.phone_number || profile?.phone || '',
    id_number: profile?.id_number || profile?.national_id || '',
    address: profile?.address || '',
  });

  // Validar formato de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleEmailChange = async (newEmail: string) => {
    setFormData({ ...formData, email: newEmail });
    
    // Limpiar timeout anterior
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout);
    }
    
    // Validar formato de email en tiempo real
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('El formato del correo electrónico no es válido');
      return;
    }
    
    // Si el email no cambió, no validar
    if (newEmail === user.email) {
      setEmailError(null);
      return;
    }
    
    // Debounce: esperar 500ms antes de verificar
    const timeout = setTimeout(async () => {
      if (!newEmail || !validateEmail(newEmail)) {
        setEmailError(null);
        return;
      }
      
      setIsCheckingEmail(true);
      setEmailError(null);
      
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: exists, error } = await supabase
          .rpc('check_email_exists', { user_email: newEmail.toLowerCase().trim() });
        
        if (error) {
          console.error('Error checking email:', error);
          setIsCheckingEmail(false);
          return;
        }
        
        if (exists) {
          setEmailError('Este correo electrónico ya está registrado por otro usuario');
        }
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);
    
    setEmailCheckTimeout(timeout);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      
      // Validaciones
      if (!formData.full_name.trim()) {
        showToast({
          type: 'error',
          description: 'El nombre completo es requerido',
        });
        setIsLoading(false);
        return;
      }

      // Validar email si ha cambiado
      const emailChanged = formData.email !== user.email;
      if (emailChanged) {
        if (!formData.email.trim()) {
          setEmailError('El correo electrónico es requerido');
          setIsLoading(false);
          return;
        }

        if (!validateEmail(formData.email)) {
          setEmailError('El formato del correo electrónico no es válido');
          setIsLoading(false);
          return;
        }

        // Verificar si el email ya existe antes de intentar cambiarlo
        const { data: emailExists, error: emailCheckError } = await supabase
          .rpc('check_email_exists', { user_email: formData.email.toLowerCase().trim() });

        if (emailCheckError) {
          console.error('Error checking email:', emailCheckError);
          setEmailError('Error al verificar el correo. Intenta nuevamente.');
          setIsLoading(false);
          return;
        }

        if (emailExists) {
          setEmailError('Este correo electrónico ya está registrado por otro usuario');
          setIsLoading(false);
          return;
        }

        // Actualizar email en Supabase Auth
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email.trim(),
        });

        if (emailError) {
          if (emailError.message.includes('already registered') || emailError.message.includes('already exists')) {
            setEmailError('Este correo electrónico ya está en uso');
          } else {
            setEmailError('Error al actualizar el correo electrónico. Intenta nuevamente.');
          }
          setIsLoading(false);
          return;
        }

        showToast({
          type: 'info',
          description: 'Se enviaron correos a ambas direcciones. Debes aceptar ambos para completar el cambio.',
        });
      }

      // Actualizar perfil en la tabla profiles
      // Incluimos el email siempre para mantener sincronización entre auth.users y profiles
      const profileUpdateData: any = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim() || null,
        address: formData.address.trim() || null,
        email: formData.email.trim(), // Siempre actualizar email para mantener sincronización
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Actualizar user_metadata también (sin cambiar id_number)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
          address: formData.address.trim(),
        },
      });

      if (metadataError) {
        console.warn('Error actualizando metadata:', metadataError);
        // No es crítico si falla metadata, el perfil ya se actualizó
      }

      showToast({
        type: 'success',
        description: emailChanged 
          ? 'Solicitud de cambio de correo enviada. Debes aceptar los correos en ambas direcciones (actual y nueva) para completar el cambio.'
          : 'Perfil actualizado correctamente',
      });

      // Refrescar la página para mostrar los cambios
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Error actualizando perfil:', error);
      showToast({
        type: 'error',
        description: error.message || 'Error al actualizar el perfil. Intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[color:var(--foreground)] mb-1 sm:mb-2">Información Personal</h2>
        <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Actualiza tu información de perfil</p>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Correo Electrónico <span className="text-red-500">*</span></span>
          </label>
          <input 
            type="email" 
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            required
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[color:var(--background)] border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 ${
              emailError 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-[color:var(--border)] focus:ring-[color:var(--accent)]'
            }`}
            placeholder="tu@email.com"
          />
          {isCheckingEmail && formData.email !== user.email && validateEmail(formData.email) && (
            <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-1 flex items-center gap-1">
              <span className="animate-spin">⏳</span>
              <span>Verificando disponibilidad de correo...</span>
            </p>
          )}
          {emailError && (
            <p className="text-[10px] sm:text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
              <span>⚠</span>
              <span>{emailError}</span>
            </p>
          )}
          {!emailError && !isCheckingEmail && formData.email !== user.email && validateEmail(formData.email) && (
            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
              <span>✓</span>
              <span>Correo disponible</span>
            </p>
          )}
          {formData.email !== user.email && !emailError && !isCheckingEmail && validateEmail(formData.email) && (
            <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mt-1 space-y-1">
              <p className="font-semibold">⚠️ Importante:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Se enviará un correo a tu dirección actual ({user.email}) que <strong>debes aceptar</strong></li>
                <li>Se enviará un correo al nuevo correo ({formData.email}) que <strong>también debes aceptar</strong></li>
                <li>El cambio solo se completará cuando <strong>aceptes ambos correos</strong></li>
              </ul>
            </div>
          )}
        </div>
        
        <div>
          <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2">
            Nombre Completo <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2">Teléfono</label>
            <input 
              type="tel" 
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+593..."
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" 
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Cédula <span className="text-red-500">*</span></span>
            </label>
            <input 
              type="text" 
              value={formData.id_number}
              disabled
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[color:var(--muted)] dark:bg-[color:var(--muted)]/50 border border-[color:var(--border)] rounded-lg text-xs sm:text-sm text-[color:var(--muted-foreground)] cursor-not-allowed" 
            />
            <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-1">La cédula no se puede modificar</p>
          </div>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2">Dirección Completa</label>
          <input 
            type="text" 
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Dirección completa"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" 
          />
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
