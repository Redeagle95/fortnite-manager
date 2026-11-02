
import type { PlayerState } from "./types";

export interface FlexMatchPerformance {
  combat: number;
  support: number;
  survival: number;
  teamUtility: number;
}

function validatePerformance(performance: FlexMatchPerformance): void {
  const values = Object.values(performance);

  if (
    values.some(
      (value) =>
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100
    )
  ) {
    throw new Error("Performances FLEX invalides.");
  }
}

// Le score retient la contribution la plus faible.
// Cela favorise une performance équilibrée dans les quatre domaines.
export function calculateVersatilityScore(
  performance: FlexMatchPerformance
): number {
  validatePerformance(performance);

  return Math.min(
    performance.combat,
    performance.support,
    performance.survival,
    performance.teamUtility
  );
}

// À appeler une seule fois à la fin du match.
export function recordFlexPerformance(
  player: PlayerState,
  performance: FlexMatchPerformance
): PlayerState {
  const versatilityScore = calculateVersatilityScore(performance);

  return {
    ...player,
    stats: {
      ...player.stats,
      versatilityScore,
    },
  };
}
