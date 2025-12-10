'use client';

import { useState, useEffect } from 'react';
import { Save, Gift, Trophy, CreditCard, Megaphone, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useToast } from '../../hooks/use-toast';

export function NotificationSettings() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [preferences, setPreferences] = useState({
    email_raffles: true,
    email_winners: true,
    email_subscription: true,
    email_marketing: false,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.user_metadata?.notification_preferences) {
          setPreferences({
            email_raffles: user.user_metadata.notification_preferences.email_raffles ?? true,
            email_winners: user.user_metadata.notification_preferences.email_winners ?? true,
            email_subscription: user.user_metadata.notification_preferences.email_subscription ?? true,
            email_marketing: user.user_metadata.notification_preferences.email_marketing ?? false,
          });
        }
      } catch (error) {
        console.error('Error cargando preferencias:', error);
      } finally {
        setIsLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, []);

  const notificationTypes = [
    { id: 'email_raffles', label: 'Nuevos Sorteos', description: 'Recibe un email cuando se publiquen nuevos sorteos', icon: Gift },
    { id: 'email_winners', label: 'Resultados de Sorteos', description: 'Notificaciones cuando ganes un sorteo', icon: Trophy },
    { id: 'email_subscription', label: 'Suscripción', description: 'Renovaciones y cambios en tu plan', icon: CreditCard },
    { id: 'email_marketing', label: 'Promociones', description: 'Ofertas especiales y contenido exclusivo', icon: Megaphone },
  ];

  const handleToggle = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      [id]: !prev[id as keyof typeof prev],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Actualizar user_metadata con las preferencias
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          notification_preferences: preferences,
        },
      });

      if (error) {
        throw error;
      }

      showToast({
        type: 'success',
        description: 'Preferencias de notificaciones guardadas correctamente',
      });
    } catch (error: any) {
      console.error('Error guardando preferencias:', error);
      showToast({
        type: 'error',
        description: error.message || 'Error al guardar las preferencias. Intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPrefs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[color:var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[color:var(--foreground)] mb-1 sm:mb-2">Notificaciones</h2>
        <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)]">Configura cómo quieres recibir actualizaciones</p>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        {notificationTypes.map((item) => {
          const IconComponent = item.icon;
          const isEnabled = preferences[item.id as keyof typeof preferences];
          return (
            <div key={item.id} className="flex items-start justify-between p-3 sm:p-4 border border-[color:var(--border)] rounded-lg hover:bg-[color:var(--muted)]/30 dark:hover:bg-[color:var(--muted)]/20 transition-all">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--accent)] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-[color:var(--foreground)]">{item.label}</h3>
                  <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-1">{item.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                <input 
                  type="checkbox" 
                  checked={isEnabled}
                  onChange={() => handleToggle(item.id)}
                  className="sr-only peer" 
                />
                <div className="w-10 h-5 sm:w-11 sm:h-6 bg-[color:var(--muted)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[color:var(--accent)] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]"></div>
              </label>
            </div>
          );
        })}
      </div>

      <button 
        onClick={handleSave}
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
            <span>Guardar Preferencias</span>
          </>
        )}
      </button>
    </div>
  );
}
