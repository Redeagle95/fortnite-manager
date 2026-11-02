import { createPlayerProgression } from "../engine/progression";
import { describe, it, expect } from "vitest";
import {
  recordWeaponShot,
  recordWeaponDamage,
  recordWeaponElimination,
  recordAssist,
} from "../engine/combatStats";
import {
  createPlayerStats,
  createPlayerWeaponStats,
} from "../engine/playerStats";
import type { PlayerState } from "../engine/types";

function createTestPlayer(): PlayerState {
  return {
    id: "player-1",
    name: "TestPlayer",
    isBot: false,
    isAlive: true,
    health: 100,
    shield: 0,
    resources: {
      wood: 0,
      stone: 0,
      metal: 0,
    },
    stats: createPlayerStats(),
    weaponStats: createPlayerWeaponStats(),
    progression: createPlayerProgression(),
  };
}

describe("Combat Stats", () => {
  it("enregistre un tir réussi", () => {
    const player = createTestPlayer();
    const updated = recordWeaponShot(player, "SNIPER", true);

    expect(updated.weaponStats.SNIPER.shotsFired).toBe(1);
    expect(updated.weaponStats.SNIPER.shotsHit).toBe(1);
  });

  it("enregistre un tir manqué", () => {
    const player = createTestPlayer();
    const updated = recordWeaponShot(player, "SMG", false);

    expect(updated.weaponStats.SMG.shotsFired).toBe(1);
    expect(updated.weaponStats.SMG.shotsHit).toBe(0);
  });

  it("enregistre les dégâts dans la bonne catégorie", () => {
    const player = createTestPlayer();
    const updated = recordWeaponDamage(player, "SHOTGUN", 80);

    expect(updated.stats.damageDealt).toBe(80);
    expect(updated.weaponStats.SHOTGUN.damageDealt).toBe(80);
    expect(updated.weaponStats.SNIPER.damageDealt).toBe(0);
  });

  it("rejette les dégâts négatifs", () => {
    const player = createTestPlayer();

    expect(() =>
      recordWeaponDamage(player, "SMG", -10)
    ).toThrow();
  });

  it("enregistre une élimination", () => {
    const player = createTestPlayer();
    const updated = recordWeaponElimination(player, "ASSAULT_RIFLE");

    expect(updated.stats.eliminations).toBe(1);
    expect(updated.weaponStats.ASSAULT_RIFLE.eliminations).toBe(1);
  });

  it("enregistre une assistance", () => {
    const player = createTestPlayer();
    const updated = recordAssist(player);

    expect(updated.stats.assists).toBe(1);
  });

  it("ne modifie pas le joueur initial", () => {
    const player = createTestPlayer();

    recordWeaponShot(player, "PISTOL", true);

    expect(player.weaponStats.PISTOL.shotsFired).toBe(0);
  });
});
