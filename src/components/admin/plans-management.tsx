'use client';

import { useState } from 'react';
import Link from 'next/link';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  benefits: string[];
  is_active: boolean;
  max_concurrent_raffles: number | null;
  created_at: string;
  updated_at: string;
};

type PlansManagementProps = {
  plans: Plan[];
};

export function PlansManagement({ plans }: PlansManagementProps) {
  const [isCreating, setIsCreating] = useState(false);

  const formatPrice = (price: number, currency: string, interval: string) => {
    const symbol = currency === 'USD' ? '$' : currency;
    const period = interval === 'month' ? '/mes' : '/año';
    return `${symbol}${price.toFixed(2)}${period}`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[color:var(--border)] bg-[color:var(--muted)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <Link href="/administrador" className="text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 flex-shrink-0 text-[color:var(--muted-foreground)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-[color:var(--foreground)]">Planes</span>
                    </div>
                  </li>
                </ol>
              </nav>
              <h1 className="mt-2 text-3xl font-bold text-[color:var(--foreground)]">Gestión de Planes</h1>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Crea y gestiona los planes de suscripción disponibles para los usuarios
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] hover:opacity-90"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Plan
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {plans.length === 0 ? (
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[color:var(--foreground)]">No hay planes creados</h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Comienza creando tu primer plan de suscripción.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)] hover:opacity-90"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[color:var(--foreground)]">{plan.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plan.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-[color:var(--foreground)]">
                        {formatPrice(plan.price, plan.currency, plan.interval)}
                      </span>
                    </div>
                  </div>

                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-[color:var(--foreground)]">Beneficios:</h4>
                      <ul className="mt-2 space-y-1">
                        {plan.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center text-sm text-[color:var(--muted-foreground)]">
                            <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.max_concurrent_raffles && (
                    <div className="mt-4">
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        Máximo {plan.max_concurrent_raffles} sorteos simultáneos
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex space-x-3">
                    <button className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)]">
                      Editar
                    </button>
                    <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                      plan.is_active
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}>
                      {plan.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
