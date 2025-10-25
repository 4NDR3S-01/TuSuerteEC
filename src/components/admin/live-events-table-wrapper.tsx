'use client';

import { Suspense } from 'react';
import { LiveEventsTable } from './live-events-table';

type LiveEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  countdown_start_at: string | null;
  stream_url: string | null;
  raffle_id: string | null;
  status: 'scheduled' | 'live' | 'completed' | 'canceled';
  is_visible: boolean;
  show_as_alert: boolean;
  created_at: string;
  raffles?: {
    id: string;
    title: string;
  } | null;
};

type LiveEventsTableWrapperProps = {
  initialEvents: LiveEvent[];
  totalCount: number;
  availableRaffles: { id: string; title: string }[];
};

export function LiveEventsTableWrapper({ initialEvents, totalCount, availableRaffles }: Readonly<LiveEventsTableWrapperProps>) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin text-4xl">⏳</div></div>}>
      <LiveEventsTable initialEvents={initialEvents} totalCount={totalCount} availableRaffles={availableRaffles} />
    </Suspense>
  );
}
