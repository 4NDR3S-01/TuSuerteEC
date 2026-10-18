'use client';

import { useState } from 'react';
import { Bell, CreditCard, Lock, User } from 'lucide-react';
import { ProfileSettings } from './profile-settings';
import { SecuritySettings } from './security-settings';
import { SubscriptionSettings } from './subscription-settings';
import { NotificationSettings } from './notification-settings';
import { Card, SectionHeader } from '../ui/kit';
import { cn } from '../../lib/utils';

type Props = {
  email: string;
  mustChangePassword: boolean;
  profile: { full_name: string; phone_number: string; id_number: string; address: string };
  subscriptions: Array<{ id: string; current_period_end: string; plans: { name: string; price: number; interval: string } | null }>;
  initialTab?: Tab;
};

type Tab = 'perfil' | 'seguridad' | 'plan' | 'comunicaciones';

const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguridad', label: 'Seguridad', icon: Lock },
  { id: 'plan', label: 'Plan', icon: CreditCard },
  { id: 'comunicaciones', label: 'Comunicaciones', icon: Bell },
];

export function SettingsPage({ email, mustChangePassword, profile, subscriptions, initialTab = 'perfil' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SectionHeader as="h1" title="Configuración" description="Tus datos, tu contraseña, tu plan y tus preferencias." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Secciones de configuración" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                tab === item.id
                  ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                  : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]',
              )}
            >
              <item.icon className="size-4" aria-hidden /> {item.label}
            </button>
          ))}
        </nav>
        <Card className="min-w-0 p-5 sm:p-8">
          {tab === 'perfil' && <ProfileSettings email={email} profile={profile} />}
          {tab === 'seguridad' && <SecuritySettings mustChangePassword={mustChangePassword} />}
          {tab === 'plan' && <SubscriptionSettings subscriptions={subscriptions} />}
          {tab === 'comunicaciones' && <NotificationSettings />}
        </Card>
      </div>
    </div>
  );
}
