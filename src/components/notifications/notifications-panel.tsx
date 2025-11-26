'use client';

import { useEffect, useState } from 'react';
import { X, Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
        .limit(20);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
      const unreadCount = data?.filter(n => !n.read).length || 0;
      onCountChange(unreadCount);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
      onCountChange(unreadCount);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .in('id', unreadIds);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onCountChange(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        const newUnreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
        onCountChange(newUnreadCount);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
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
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
      case 'raffle': return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'prize': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'raffle': return '🎁';
      case 'prize': return '🏆';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📢';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-[color:var(--card)] border-l border-[color:var(--border)] shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--border)]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[color:var(--accent)]" />
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Notificaciones</h2>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[color:var(--muted)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && notifications.some(n => !n.read) && (
          <div className="p-3 border-b border-[color:var(--border)]">
            <button
              onClick={markAllAsRead}
              className="text-sm text-[color:var(--accent)] hover:underline font-medium flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--accent)]"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Bell className="w-16 h-16 text-[color:var(--muted-foreground)] opacity-50 mb-4" />
              <p className="text-[color:var(--muted-foreground)] text-sm">
                No tienes notificaciones
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[color:var(--muted)]/50 transition-colors ${
                    !notification.read ? 'bg-[color:var(--accent)]/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl ${getTypeColor(notification.type)} flex items-center justify-center text-xl border`}>
                        {getTypeIcon(notification.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-[color:var(--foreground)] truncate">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-[color:var(--accent)] flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-xs text-[color:var(--muted-foreground)] mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[color:var(--muted-foreground)]">
                          {new Date(notification.created_at).toLocaleDateString('es-EC', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        
                        <div className="flex gap-1">
                          {notification.action_url && (
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="p-1.5 hover:bg-[color:var(--muted)] rounded-md transition-colors"
                              title="Ver"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 hover:bg-[color:var(--muted)] rounded-md transition-colors"
                              title="Marcar como leída"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
