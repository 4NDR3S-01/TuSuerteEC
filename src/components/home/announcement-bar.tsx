import Link from "next/link";

import { LIVE_EVENT } from "../../config/live-event";
import { LiveCountdown } from "./live-countdown";

export function AnnouncementBar() {
  return (
    <div
      data-announcement-bar
      className="w-full border-b border-[color:var(--border)] bg-[rgba(249,115,22,0.08)] px-4 py-3 text-xs text-[color:var(--foreground)] sm:text-sm"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-[color:var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(249,115,22,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] sm:text-[11px]">
            Evento en vivo
          </span>
          <span className="font-medium text-[color:var(--foreground)]">{LIVE_EVENT.title}</span>
          <span className="hidden sm:inline">·</span>
          <span>{LIVE_EVENT.description}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveCountdown variant="compact" />
          {LIVE_EVENT.streamUrl ? (
            <Link
              href={LIVE_EVENT.streamUrl}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
            >
              Ver transmisión
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
