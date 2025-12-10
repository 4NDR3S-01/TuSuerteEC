'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, User, Lock, CreditCard, Bell } from 'lucide-react';
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
    { id: 'profile' as Tab, label: 'Perfil', icon: User, description: 'Información personal' },
    { id: 'security' as Tab, label: 'Seguridad', icon: Lock, description: 'Contraseña y seguridad' },
    { id: 'subscriptions' as Tab, label: 'Suscripciones', icon: CreditCard, description: 'Planes y pagos', badge: subscriptions.length > 0 ? subscriptions.length : undefined },
    { id: 'notifications' as Tab, label: 'Notificaciones', icon: Bell, description: 'Preferencias de avisos' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--background)] via-[color:var(--background)] to-[color:var(--muted)]/10 dark:to-[color:var(--muted)]/5">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[color:var(--accent)] hover:text-orange-500 dark:hover:text-orange-400 transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[color:var(--foreground)] flex items-center gap-2 sm:gap-3">
                <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[color:var(--accent)] flex-shrink-0" />
                <span className="truncate">Configuración</span>
              </h1>
              <p className="text-xs sm:text-sm text-[color:var(--muted-foreground)] mt-1 sm:mt-2">
                Gestiona tu cuenta y preferencias
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden mb-4 sm:mb-6">
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-2">
            <div className="grid grid-cols-2 gap-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[color:var(--accent)]/10 dark:from-[color:var(--accent)]/20 to-orange-500/10 dark:to-orange-500/20 text-[color:var(--accent)] border-2 border-[color:var(--accent)]/30 dark:border-[color:var(--accent)]/50'
                        : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/50 border-2 border-transparent'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="truncate w-full text-center">{tab.label}</span>
                    {Boolean(tab.badge) && (
                      <span className="px-1.5 py-0.5 bg-[color:var(--accent)] text-white text-[9px] font-bold rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl sm:rounded-2xl p-3 sm:p-4 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-[color:var(--accent)]/10 dark:from-[color:var(--accent)]/20 to-orange-500/10 dark:to-orange-500/20 text-[color:var(--accent)] border-2 border-[color:var(--accent)]/30 dark:border-[color:var(--accent)]/50'
                          : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold truncate">{tab.label}</div>
                            <div className="text-[10px] sm:text-xs opacity-75 truncate">{tab.description}</div>
                          </div>
                        </div>
                        {Boolean(tab.badge) && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-[color:var(--accent)] text-white text-[9px] sm:text-xs font-bold rounded-full flex-shrink-0">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg">
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
