export type LiveEventConfig = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  countdownStartAt?: string;
  streamUrl?: string;
};

export const LIVE_EVENT: LiveEventConfig = {
  id: "upcoming-draw",
  title: "Próxima transmisión en vivo",
  description: "Conéctate para conocer a los ganadores del sorteo semanal.",
  // Este valor será administrable desde el panel; actualizarlo automáticamente
  startAt: "2025-01-31T20:00:00-05:00",
  // Opcional: controla desde cuándo comienza la barra de progreso
  countdownStartAt: "2025-01-30T20:00:00-05:00",
  streamUrl: "https://www.youtube.com/@tusuerte/live",
};

export function getCountdownBounds(config: LiveEventConfig) {
  const start = new Date(config.startAt).getTime();
  const lowerBound = config.countdownStartAt
    ? new Date(config.countdownStartAt).getTime()
    : start - 1000 * 60 * 60 * 24; // 24 horas antes por defecto

  return {
    startTimestamp: start,
    countdownStartTimestamp: lowerBound,
  };
}
