
import type { PlayerState, WeaponType } from "./types";

function validateAmount(amount: number, label: string): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} invalide.`);
  }
}

// Enregistre un tir et indique s'il a touché sa cible.
export function recordWeaponShot(
  player: PlayerState,
  weapon: WeaponType,
  hit: boolean
): PlayerState {
  if (typeof hit !== "boolean") {
    throw new Error("Résultat du tir invalide.");
  }

  const weaponStats = {
    ...player.weaponStats[weapon],
    shotsFired: player.weaponStats[weapon].shotsFired + 1,
    shotsHit:
      player.weaponStats[weapon].shotsHit + (hit ? 1 : 0),
  };

  return {
    ...player,
    weaponStats: {
      ...player.weaponStats,
      [weapon]: weaponStats,
    },
  };
}

// Enregistre les dégâts infligés avec une catégorie d'arme.
export function recordWeaponDamage(
  player: PlayerState,
  weapon: WeaponType,
  damage: number
): PlayerState {
  validateAmount(damage, "Dégâts");

  return {
    ...player,
    stats: {
      ...player.stats,
      damageDealt: player.stats.damageDealt + damage,
    },
    weaponStats: {
      ...player.weaponStats,
      [weapon]: {
        ...player.weaponStats[weapon],
        damageDealt:
          player.weaponStats[weapon].damageDealt + damage,
      },
    },
  };
}

// Enregistre une élimination avec une catégorie d'arme.
export function recordWeaponElimination(
  player: PlayerState,
  weapon: WeaponType
): PlayerState {
  return {
    ...player,
    stats: {
      ...player.stats,
      eliminations: player.stats.eliminations + 1,
    },
    weaponStats: {
      ...player.weaponStats,
      [weapon]: {
        ...player.weaponStats[weapon],
        eliminations: player.weaponStats[weapon].eliminations + 1,
      },
    },
  };
}

// Enregistre une assistance.
export function recordAssist(player: PlayerState): PlayerState {
  return {
    ...player,
    stats: {
      ...player.stats,
      assists: player.stats.assists + 1,
    },
  };
}
