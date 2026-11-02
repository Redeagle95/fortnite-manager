
export interface ProbabilityFactors {
  skill: number;
  weapon: number;
  positioning: number;
  health: number;
  opponent: number;
}

export function calculateSuccessProbability(
  factors: ProbabilityFactors
): number {
  const values = Object.values(factors);

  for (const value of values) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(
        "Chaque facteur doit être compris entre 0 et 100."
      );
    }
  }

  const score =
    factors.skill * 0.35 +
    factors.weapon * 0.20 +
    factors.positioning * 0.20 +
    factors.health * 0.10 +
    (100 - factors.opponent) * 0.15;

  return Math.max(1, Math.min(99, score));
}
