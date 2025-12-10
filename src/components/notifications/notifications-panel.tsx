'use client';

import { useEffect, useState } from 'react';
import { X, Bell, Check, Trash2, ExternalLink, Gift, Trophy, AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '../../hooks/use-toast';

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'raffle' | 'prize';
  read: boolean;
  action_url: string | null;
  created_at: string;
};

type NotificationsPanelProps = {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
};

export function NotificationsPanel({ userId, isOpen, onClose, onCountChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!isOpen || !userId) return;
    
    loadNotifications();
  }, [isOpen, userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        showToast({
          type: 'error',
          description: 'Error al cargar notificaciones',
        });
        return;
      }

      setNotifications(data || []);
      const unreadCount = data?.filter(n => !n.read).length || 0;
      onCountChange(unreadCount);
    } catch (error) {
      console.error('Error:', error);
      showToast({
        type: 'error',
        description: 'Error al cargar notificaciones',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;
    
    setProcessingIds(prev => new Set(prev).add(notificationId));
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
      onCountChange(unreadCount);
    } catch (error) {
      console.error('Error marking as read:', error);
      showToast({
        type: 'error',
        description: 'Error al marcar como leída',
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) {
        throw error;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onCountChange(0);
      
      showToast({
        type: 'success',
        description: 'Todas las notificaciones marcadas como leídas',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast({
        type: 'error',
        description: 'Error al marcar todas como leídas',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;
    
    setProcessingIds(prev => new Set(prev).add(notificationId));
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        const newUnreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
        onCountChange(newUnreadCount);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast({
        type: 'error',
        description: 'Error al eliminar la notificación',
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      onClose();
      router.push(notification.action_url);
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 border-green-500/20 dark:border-green-500/30';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/20 dark:border-yellow-500/30';
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 border-red-500/20 dark:border-red-500/30';
      case 'raffle': return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20 dark:border-purple-500/30';
      case 'prize': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20 dark:border-orange-500/30';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30';
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'raffle': return <Gift className={iconClass} />;
      case 'prize': return <Trophy className={iconClass} />;
      case 'success': return <CheckCircle2 className={iconClass} />;
      case 'warning': return <AlertTriangle className={iconClass} />;
      case 'error': return <X className={iconClass} />;
      default: return <Info className={iconClass} />;
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 lg:w-[28rem] bg-[color:var(--card)] border-l border-[color:var(--border)] shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[color:var(--border)] bg-gradient-to-r from-[color:var(--card)] to-[color:var(--muted)]/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-[color:var(--accent)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 dark:bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[color:var(--foreground)]">Notificaciones</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[color:var(--muted)] rounded-lg transition-colors"
            aria-label="Cerrar panel de notificaciones"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-3 sm:p-4 border-b border-[color:var(--border)] bg-[color:var(--muted)]/30">
            <button
              onClick={markAllAsRead}
              className="text-xs sm:text-sm text-[color:var(--accent)] hover:text-orange-500 dark:hover:text-orange-400 font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors"
            >
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Marcar todas como leídas</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-[color:var(--accent)]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center">
              <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-[color:var(--muted-foreground)] opacity-50 mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-[color:var(--muted-foreground)] font-medium">
                No tienes notificaciones
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
                Te notificaremos cuando haya novedades
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {notifications.map((notification) => {
                const isProcessing = processingIds.has(notification.id);
                return (
                  <div
                    key={notification.id}
                    className={`p-3 sm:p-4 hover:bg-[color:var(--muted)]/50 dark:hover:bg-[color:var(--muted)]/30 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-[color:var(--accent)]/5 dark:bg-[color:var(--accent)]/10 border-l-2 border-l-[color:var(--accent)]' : ''
                    }`}
                    onClick={() => !notification.read && !isProcessing && markAsRead(notification.id)}
                  >
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${getTypeColor(notification.type)} flex items-center justify-center border-2`}>
                          {getTypeIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-xs sm:text-sm text-[color:var(--foreground)] truncate">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-[color:var(--accent)] flex-shrink-0 mt-1 animate-pulse" />
                          )}
                        </div>
                        
                        <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] sm:text-[10px] text-[color:var(--muted-foreground)]">
                            {new Date(notification.created_at).toLocaleDateString('es-EC', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          
                          <div className="flex gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-[color:var(--muted-foreground)]" />
                            ) : (
                              <>
                                {notification.action_url && (
                                  <button
                                    onClick={() => handleNotificationClick(notification)}
                                    className="p-1.5 hover:bg-[color:var(--muted)] rounded-md transition-colors"
                                    title="Ver"
                                    aria-label="Ver notificación"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                )}
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-1.5 hover:bg-[color:var(--muted)] rounded-md transition-colors"
                                    title="Marcar como leída"
                                    aria-label="Marcar como leída"
                                  >
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1.5 hover:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md transition-colors"
                                  title="Eliminar"
                                  aria-label="Eliminar notificación"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
