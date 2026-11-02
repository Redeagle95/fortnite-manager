
import type {
  PlayerProgression,
  WeaponCategory,
} from "./progression";

import type {
  PlayerStats,
  PlayerWeaponStats,
} from "./types";

import {
  calculateRoleProgression,
  type RoleProgressionResult,
  type RoleProgressionConfig,
} from "./roleProgression";

import {
  calculateWeaponProgression,
  type WeaponProgressionResult,
  type WeaponProgressionConfig,
} from "./weaponProgression";

export interface MatchProgressionResult {
  progression: PlayerProgression;
  roleResult: RoleProgressionResult;
  weaponResults: WeaponProgressionResult[];
}

export interface MatchProgressionConfig {
  role?: RoleProgressionConfig;
  weapon?: WeaponProgressionConfig;
}

function hasUsedWeapon(
  stats: PlayerWeaponStats[WeaponCategory]
): boolean {
  return (
    stats.shotsFired > 0 ||
    stats.shotsHit > 0 ||
    stats.damageDealt > 0 ||
    stats.eliminations > 0 ||
    stats.timeUsedMinutes > 0
  );
}

export function applyMatchProgression(
  progression: PlayerProgression,
  stats: PlayerStats,
  weaponStats: PlayerWeaponStats,
  now: number = Date.now(),
  config: MatchProgressionConfig = {}
): MatchProgressionResult {
  if (!Number.isFinite(now) || now < 0) {
    throw new Error("Horodatage invalide.");
  }

  if (stats.placement === null) {
    throw new Error("Le placement du joueur est manquant.");
  }

  const currentRole = progression.roles.find(
    (role) => role.role === progression.currentRole
  );

  if (!currentRole) {
    throw new Error("Maîtrise du rôle actuel introuvable.");
  }

  // Calcul de la progression du rôle actuel.
  const roleResult = calculateRoleProgression(
    progression.currentRole,
    currentRole.mastery,
    {
      placement: stats.placement,
      eliminations: stats.eliminations,
      assists: stats.assists,
      damageDealt: stats.damageDealt,
      healingGiven: stats.healingGiven,
      revives: stats.revives,
      healingItemsDistributed: stats.healingItemsDistributed,
      survivalContribution: stats.survivalContribution,
      versatilityScore: stats.versatilityScore,
    },
    config.role
  );

  // Calcul indépendant de chaque catégorie d'arme.
  const weaponResults = progression.weapons.map((weapon) =>
    calculateWeaponProgression(
      weapon.category,
      weapon.mastery,
      weaponStats[weapon.category],
      config.weapon
    )
  );

  // Création d'une nouvelle progression sans modifier l'originale.
  const updatedRoles = progression.roles.map((role) =>
    role.role === progression.currentRole
      ? {
          ...role,
          mastery: roleResult.newMastery,
          lastPracticedAt: now,
        }
      : { ...role }
  );

  const updatedWeapons = progression.weapons.map((weapon) => {
    const result = weaponResults.find(
      (item) => item.category === weapon.category
    );

    if (!result) {
      return { ...weapon };
    }

    const used = hasUsedWeapon(weaponStats[weapon.category]);

    return {
      ...weapon,
      mastery: result.newMastery,
      lastPracticedAt: used ? now : weapon.lastPracticedAt,
    };
  });

  return {
    progression: {
      ...progression,
      roles: updatedRoles,
      weapons: updatedWeapons,
    },
    roleResult,
    weaponResults,
  };
}
