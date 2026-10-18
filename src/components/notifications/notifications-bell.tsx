'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationsPanel } from './notifications-panel';
import { getMyUnreadNotificationsCount } from '../../lib/actions/notifications';

/** Campana con contador de avisos no leídos; se actualiza cada 30 segundos */
export function NotificationsBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = () => getMyUnreadNotificationsCount().then(setCount).catch(() => undefined);
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Notificaciones: ${count} sin leer` : 'Notificaciones'}
        className="relative flex size-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]"
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[color:var(--danger)] text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      <NotificationsPanel userId={userId} isOpen={open} onClose={() => setOpen(false)} onCountChange={setCount} />
    </>
  );
}
