import { seasonRegistry, type FortniteSeason } from "./seasonRegistry";

export function resolveSeason(careerDate: string): FortniteSeason {
  const date = new Date(careerDate + "T12:00:00");
  const timestamp = date.getTime();
  const match = seasonRegistry.find((season) => {
    const start = new Date(season.startsAt + "T00:00:00").getTime();
    const end = new Date(season.endsAt + "T23:59:59").getTime();
    return timestamp >= start && timestamp <= end;
  });

  return match ?? seasonRegistry[seasonRegistry.length - 1];
}

export function formatSeasonDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(date + "T12:00:00"));
}
