import { createPlayerProgression } from "../engine/progression";
import { describe, it, expect } from "vitest";
import {
  recordHealingGiven,
  recordRevive,
  recordHealingItemDistributed,
  recordSurvivalContribution,
} from "../engine/supportStats";
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

describe("Support Stats", () => {
  it("enregistre les soins donnés", () => {
    const updated = recordHealingGiven(createTestPlayer(), 75);

    expect(updated.stats.healingGiven).toBe(75);
  });

  it("enregistre une réanimation", () => {
    const updated = recordRevive(createTestPlayer());

    expect(updated.stats.revives).toBe(1);
  });

  it("enregistre les objets de soin distribués", () => {
    const updated = recordHealingItemDistributed(
      createTestPlayer(),
      3
    );

    expect(updated.stats.healingItemsDistributed).toBe(3);
  });

  it("enregistre la contribution à la survie", () => {
    const updated = recordSurvivalContribution(
      createTestPlayer(),
      50
    );

    expect(updated.stats.survivalContribution).toBe(50);
  });

  it("rejette une quantité de soins négative", () => {
    expect(() =>
      recordHealingGiven(createTestPlayer(), -10)
    ).toThrow();
  });

  it("rejette une quantité non entière d'objets", () => {
    expect(() =>
      recordHealingItemDistributed(createTestPlayer(), 1.5)
    ).toThrow();
  });

  it("ne modifie pas le joueur initial", () => {
    const player = createTestPlayer();

    recordRevive(player);

    expect(player.stats.revives).toBe(0);
  });
});
