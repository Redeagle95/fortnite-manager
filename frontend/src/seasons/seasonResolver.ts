import { seasonRegistry, type FortniteSeason } from "./seasonRegistry";

export function resolveSeason(careerDate: string): FortniteSeason {
  const timestamp = new Date(careerDate + "T12:00:00").getTime();
  const match = seasonRegistry.find((season) => {
    const start = new Date(season.startsAt + "T00:00:00").getTime();
    const end = new Date(season.endsAt + "T23:59:59").getTime();
    return timestamp >= start && timestamp <= end;
  });

  if (match) return match;

  // Keep the closest known season active outside the preview dates.
  // Production calendar data will cover the complete 2019–2026 timeline.
  return [...seasonRegistry]
    .sort((a, b) => Math.abs(new Date(a.startsAt).getTime() - timestamp)
      - Math.abs(new Date(b.startsAt).getTime() - timestamp))[0];
}

export function formatSeasonDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(date + "T12:00:00"));
}