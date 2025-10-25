'use client';

import { Suspense } from 'react';
import { RafflesTable } from './raffles-table';

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_category: string | null;
  image_url: string | null;
  is_trending: boolean | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  status: 'draft' | 'active' | 'closed' | 'drawn' | 'completed';
  entry_mode: 'subscribers_only' | 'tickets_only' | 'hybrid';
  total_winners: number;
  max_entries_per_user: number | null;
  created_at: string;
  _count?: {
    raffle_entries: number;
  };
};

type RafflesTableWrapperProps = {
  initialRaffles: Raffle[];
  totalCount: number;
};

function RafflesTableContent({ initialRaffles, totalCount }: RafflesTableWrapperProps) {
  return <RafflesTable initialRaffles={initialRaffles} totalCount={totalCount} />;
}

export function RafflesTableWrapper({ initialRaffles, totalCount }: RafflesTableWrapperProps) {
  return (
    <Suspense fallback={
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--accent)] border-r-transparent"></div>
          <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">Cargando sorteos...</p>
        </div>
      </div>
    }>
      <RafflesTableContent initialRaffles={initialRaffles} totalCount={totalCount} />
    </Suspense>
  );
}
