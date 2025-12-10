'use client';

import { useState } from 'react';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

export function SecuritySettings({ user }: any) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validaciones
      if (!formData.currentPassword) {
        showToast({
          type: 'error',
          description: 'Debes ingresar tu contraseña actual',
        });
        setIsLoading(false);
        return;
      }

      if (formData.newPassword.length < 8) {
        showToast({
          type: 'error',
          description: 'La nueva contraseña debe tener al menos 8 caracteres',
        });
        setIsLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        showToast({
          type: 'error',
          description: 'Las contraseñas no coinciden',
        });
        setIsLoading(false);
        return;
      }

      if (formData.currentPassword === formData.newPassword) {
        showToast({
          type: 'error',
          description: 'La nueva contraseña debe ser diferente a la actual',
        });
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();

      // Verificar contraseña actual intentando iniciar sesión
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      });

      if (signInError) {
        showToast({
          type: 'error',
          description: 'La contraseña actual es incorrecta',
        });
        setIsLoading(false);
        return;
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      showToast({
        type: 'success',
        description: 'Contraseña actualizada correctamente',
      });

      // Limpiar formulario
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error actualizando contraseña:', error);
      showToast({
        type: 'error',
        description: error.message || 'Error al actualizar la contraseña. Intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[color:var(--foreground)] mb-1 sm:mb-2">Seguridad</h2>
        <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Gestiona tu contraseña y configuración de seguridad</p>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        <div className="p-3 sm:p-4 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 dark:border-blue-500/50 rounded-lg">
          <div className="flex items-start gap-2 sm:gap-3">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-blue-600 dark:text-blue-400">Cambiar Contraseña</h3>
              <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-1">Tu contraseña debe tener al menos 8 caracteres</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2">Contraseña Actual</label>
          <div className="relative">
            <input 
              type={showPasswords.current ? 'text' : 'password'} 
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" 
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2">Nueva Contraseña</label>
          <div className="relative">
            <input 
              type={showPasswords.new ? 'text' : 'password'} 
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              minLength={8}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" 
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {formData.newPassword && formData.newPassword.length < 8 && (
            <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Mínimo 8 caracteres</p>
          )}
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] block mb-1.5 sm:mb-2">Confirmar Nueva Contraseña</label>
          <div className="relative">
            <input 
              type={showPasswords.confirm ? 'text' : 'password'} 
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" 
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Las contraseñas no coinciden</p>
          )}
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 dark:to-orange-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Actualizando...</span>
            </>
          ) : (
            'Actualizar Contraseña'
          )}
        </button>
      </div>
    </form>
  );
}
