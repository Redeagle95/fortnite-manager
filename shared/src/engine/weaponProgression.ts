
import type { WeaponCategory } from "./progression";

export interface WeaponMatchPerformance {
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  eliminations: number;
  timeUsedMinutes: number;
}

export interface WeaponProgressionConfig {
  maxGainPerMatch: number;
  minGainPerMatch: number;
}

export interface WeaponProgressionResult {
  category: WeaponCategory;
  previousMastery: number;
  gain: number;
  newMastery: number;
}

export const DEFAULT_WEAPON_PROGRESSION_CONFIG: WeaponProgressionConfig = {
  maxGainPerMatch: 5,
  minGainPerMatch: 0,
};

export function calculateWeaponMasteryGain(
  performance: WeaponMatchPerformance,
  config: WeaponProgressionConfig = DEFAULT_WEAPON_PROGRESSION_CONFIG
): number {
  const values = Object.values(performance);

  if (
    values.some((value) => !Number.isFinite(value) || value < 0) ||
    !Number.isInteger(performance.shotsFired) ||
    !Number.isInteger(performance.shotsHit) ||
    performance.shotsHit > performance.shotsFired
  ) {
    throw new Error("Performances d'arme invalides.");
  }

  if (
    !Number.isFinite(config.minGainPerMatch) ||
    !Number.isFinite(config.maxGainPerMatch) ||
    config.minGainPerMatch < 0 ||
    config.maxGainPerMatch < config.minGainPerMatch
  ) {
    throw new Error("Configuration de progression invalide.");
  }

  const accuracy =
    performance.shotsFired === 0
      ? 0
      : performance.shotsHit / performance.shotsFired;

  const score =
    accuracy * 40 +
    performance.damageDealt * 0.01 +
    performance.eliminations * 2 +
    performance.timeUsedMinutes * 0.1;

  if (score <= 0) {
    return config.minGainPerMatch;
  }

  return Math.min(
    config.maxGainPerMatch,
    Math.max(config.minGainPerMatch, score)
  );
}

export function applyWeaponMasteryGain(
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

export function calculateWeaponProgression(
  category: WeaponCategory,
  currentMastery: number,
  performance: WeaponMatchPerformance,
  config: WeaponProgressionConfig = DEFAULT_WEAPON_PROGRESSION_CONFIG
): WeaponProgressionResult {
  if (
    !Number.isFinite(currentMastery) ||
    currentMastery < 0 ||
    currentMastery > 100
  ) {
    throw new Error("Maîtrise actuelle invalide.");
  }

  const gain = calculateWeaponMasteryGain(performance, config);
  const newMastery = applyWeaponMasteryGain(currentMastery, gain);

  return {
    category,
    previousMastery: currentMastery,
    gain: newMastery - currentMastery,
    newMastery,
  };
}
