'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProfileSettings } from './profile-settings';
import { SecuritySettings } from './security-settings';
import { SubscriptionSettings } from './subscription-settings';
import { NotificationSettings } from './notification-settings';

type User = {
  id: string;
  email: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  national_id: string | null;
};

type Subscription = {
  id: string;
  status: string;
  current_period_end: string;
  plans: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
};

interface SettingsPageProps {
  user: User;
  profile: Profile | null;
  subscriptions: Subscription[];
}

type Tab = 'profile' | 'security' | 'subscriptions' | 'notifications';

export function SettingsPage({ user, profile, subscriptions }: Readonly<SettingsPageProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs = [
    { id: 'profile' as Tab, label: 'Perfil', icon: '👤', description: 'Información personal' },
    { id: 'security' as Tab, label: 'Seguridad', icon: '🔒', description: 'Contraseña y seguridad' },
    { id: 'subscriptions' as Tab, label: 'Suscripciones', icon: '💳', description: 'Planes y pagos', badge: subscriptions.length > 0 ? subscriptions.length : undefined },
    { id: 'notifications' as Tab, label: 'Notificaciones', icon: '🔔', description: 'Preferencias de avisos' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)]/10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[color:var(--foreground)] flex items-center gap-3">
                <span className="text-4xl">⚙️</span>
                <span>Configuración</span>
              </h1>
              <p className="text-[color:var(--muted-foreground)] mt-2">
                Gestiona tu cuenta y preferencias
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-4 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[color:var(--accent)]/10 to-orange-500/10 text-[color:var(--accent)] border-2 border-[color:var(--accent)]/30'
                        : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{tab.icon}</span>
                        <div>
                          <div className="font-bold">{tab.label}</div>
                          <div className="text-xs opacity-75">{tab.description}</div>
                        </div>
                      </div>
                      {Boolean(tab.badge) && (
                        <span className="px-2 py-0.5 bg-[color:var(--accent)] text-white text-xs font-bold rounded-full">
                          {tab.badge}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 sm:p-8 shadow-lg">
              {activeTab === 'profile' && <ProfileSettings user={user} profile={profile} />}
              {activeTab === 'security' && <SecuritySettings user={user} />}
              {activeTab === 'subscriptions' && <SubscriptionSettings subscriptions={subscriptions} />}
              {activeTab === 'notifications' && <NotificationSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
