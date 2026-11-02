
import type {
  PlayerStats,
  PlayerWeaponStats,
  WeaponType,
  WeaponMatchStats,
} from "./types";

export function createPlayerStats(): PlayerStats {
  return {
    eliminations: 0,
    assists: 0,
    damageDealt: 0,
    placement: null,

    healingGiven: 0,
    revives: 0,
    healingItemsDistributed: 0,
    survivalContribution: 0,

    versatilityScore: 0,
  };
}

export function createWeaponMatchStats(): WeaponMatchStats {
  return {
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    eliminations: 0,
    timeUsedMinutes: 0,
  };
}

export function createPlayerWeaponStats(): PlayerWeaponStats {
  const categories: WeaponType[] = [
    "ASSAULT_RIFLE",
    "SHOTGUN",
    "SMG",
    "SNIPER",
    "PISTOL",
  ];

  return Object.fromEntries(
    categories.map((category) => [
      category,
      createWeaponMatchStats(),
    ])
  ) as PlayerWeaponStats;
}
