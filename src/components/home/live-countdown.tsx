"use client";

import { useEffect, useMemo, useState } from "react";

type LiveEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  stream_url: string | null;
  status: string;
  countdown_start_at: string | null;
};

type CountdownState = {
  remainingMs: number;
  percentage: number;
  isLive: boolean;
  isExpired: boolean;
};

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = MS_IN_SECOND * 60;
const MS_IN_HOUR = MS_IN_MINUTE * 60;
const MS_IN_DAY = MS_IN_HOUR * 24;

function formatDuration(ms: number) {
  if (ms <= 0) {
    return "00:00:00";
  }

  const days = Math.floor(ms / MS_IN_DAY);
  const hours = Math.floor((ms % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((ms % MS_IN_HOUR) / MS_IN_MINUTE);
  const seconds = Math.floor((ms % MS_IN_MINUTE) / MS_IN_SECOND);

  const pad = (value: number) => value.toString().padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function calculateCountdown(event: LiveEvent): CountdownState {
  const startTimestamp = new Date(event.start_at).getTime();
  const countdownStartTimestamp = event.countdown_start_at 
    ? new Date(event.countdown_start_at).getTime()
    : startTimestamp - MS_IN_DAY; // 24 horas antes por defecto
    
  const now = Date.now();

  const totalWindow = Math.max(startTimestamp - countdownStartTimestamp, 1);
  const clampedNow = Math.min(Math.max(now, countdownStartTimestamp), startTimestamp);
  const elapsed = clampedNow - countdownStartTimestamp;
  const remainingMs = Math.max(startTimestamp - now, 0);

  return {
    remainingMs,
    percentage: Math.min((elapsed / totalWindow) * 100, 100),
    isLive: now >= startTimestamp,
    isExpired: now > startTimestamp + MS_IN_HOUR, // una hora después consideramos concluido
  };
}

type LiveCountdownProps = {
  readonly event: LiveEvent;
  readonly variant?: "default" | "compact";
};

export function LiveCountdown({ event, variant = "default" }: LiveCountdownProps) {
  const [state, setState] = useState<CountdownState | null>(null);

  useEffect(() => {
    const update = () => setState(calculateCountdown(event));
    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [event]);

  const formattedRemaining = useMemo(
    () => (state ? formatDuration(state.remainingMs) : "—"),
    [state?.remainingMs],
  );
  const startsAt = useMemo(() => new Date(event.start_at), [event.start_at]);
  const formattedStartDate = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Guayaquil",
      }).format(startsAt),
    [startsAt],
  );

  if (state?.isExpired) {
    return null;
  }

  const isLive = state?.isLive ?? false;
  const percentage = state?.percentage ?? 0;

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/85 px-4 py-1.5 text-xs font-semibold text-[color:var(--foreground)]">
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
          Comienza en
        </span>
        <span className="font-mono text-sm">{isLive ? "00:00:00" : formattedRemaining}</span>
      </span>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-5 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18)_0%,_transparent_65%)]" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(249,115,22,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
            {isLive ? "EN VIVO" : "PRÓXIMA TRANSMISIÓN"}
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold sm:text-2xl">{event.title}</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">{event.description || 'Conéctate para conocer más detalles'}</p>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[color:var(--muted-foreground)] sm:text-sm">
              {isLive ? "Comenzó hace instantes" : `Inicio: ${formattedStartDate}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/85 px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] shadow-sm">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Comienza en
            </span>
            <span className="text-base font-mono">{isLive ? "00:00:00" : formattedRemaining}</span>
          </div>
          {event.stream_url ? (
            <a
              href={event.stream_url}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              target="_blank"
              rel="noreferrer"
            >
              Ver transmisión
            </a>
          ) : null}
        </div>
      </div>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[color:var(--border)]/60">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}
