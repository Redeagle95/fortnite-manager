
import type { PlayerRole } from "./progression";

export interface MatchRolePerformance {
  placement: number;
  eliminations: number;
  assists: number;
  damageDealt: number;
  healingGiven: number;
  revives: number;
  healingItemsDistributed: number;
  survivalContribution: number;
  versatilityScore: number;
}

export interface RoleProgressionConfig {
  maxGainPerMatch: number;
  minGainPerMatch: number;
}

export interface RoleProgressionResult {
  role: PlayerRole;
  previousMastery: number;
  gain: number;
  newMastery: number;
}

export const DEFAULT_ROLE_PROGRESSION_CONFIG: RoleProgressionConfig = {
  maxGainPerMatch: 5,
  minGainPerMatch: 0,
};

export function calculateRoleMasteryGain(
  role: PlayerRole,
  performance: MatchRolePerformance,
  config: RoleProgressionConfig = DEFAULT_ROLE_PROGRESSION_CONFIG
): number {
  const values = Object.values(performance);

  if (
    values.some((value) => !Number.isFinite(value) || value < 0) ||
    !Number.isInteger(performance.placement) ||
    performance.placement < 1
  ) {
    throw new Error("Performances de match invalides.");
  }

  if (
    !Number.isFinite(config.minGainPerMatch) ||
    !Number.isFinite(config.maxGainPerMatch) ||
    config.minGainPerMatch < 0 ||
    config.maxGainPerMatch < config.minGainPerMatch
  ) {
    throw new Error("Configuration de progression invalide.");
  }

  let score: number;

  switch (role) {
    case "IGL":
      score = 1 / performance.placement;
      break;

    case "FRAGGER":
      score =
        performance.eliminations +
        performance.assists +
        performance.damageDealt;
      break;

    case "SUPPORT":
      score =
        performance.healingGiven +
        performance.revives +
        performance.healingItemsDistributed +
        performance.survivalContribution;
      break;

    case "FLEX":
      score = performance.versatilityScore;
      break;
  }

  if (score <= 0) {
    return config.minGainPerMatch;
  }

  return Math.min(config.maxGainPerMatch, Math.max(config.minGainPerMatch, score));
}

export function applyRoleMasteryGain(
  currentMastery: number,
  gain: number
): number {
  if (
    !Number.isFinite(currentMastery) ||
    currentMastery < 0 ||
    currentMastery > 100 ||
    !Number.isFinite(gain) ||
    gain < 0
  ) {
    throw new Error("Valeur de maîtrise invalide.");
  }

  return Math.min(100, currentMastery + gain);
}

export function calculateRoleProgression(
  role: PlayerRole,
  currentMastery: number,
  performance: MatchRolePerformance,
  config: RoleProgressionConfig = DEFAULT_ROLE_PROGRESSION_CONFIG
): RoleProgressionResult {
  if (
    !Number.isFinite(currentMastery) ||
    currentMastery < 0 ||
    currentMastery > 100
  ) {
    throw new Error("Maîtrise actuelle invalide.");
  }

  const gain = calculateRoleMasteryGain(role, performance, config);
  const newMastery = applyRoleMasteryGain(currentMastery, gain);

  return {
    role,
    previousMastery: currentMastery,
    gain: newMastery - currentMastery,
    newMastery,
  };
}
