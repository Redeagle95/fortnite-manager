import { createPlayerProgression } from "../engine/progression";
import { describe, it, expect } from "vitest";
import {
  calculateVersatilityScore,
  recordFlexPerformance,
} from "../engine/flexStats";
import {
  createPlayerStats,
  createPlayerWeaponStats,
} from "../engine/playerStats";
import type { PlayerState } from "../engine/types";

function createTestPlayer(): PlayerState {
  return {
    id: "player-1",
    name: "Test",
    isBot: false,
    isAlive: true,
    health: 100,
    shield: 100,
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

describe("flexStats", () => {
  it("calcule le score d'une performance équilibrée", () => {
    const score = calculateVersatilityScore({
      combat: 80,
      support: 80,
      survival: 80,
      teamUtility: 80,
    });

    expect(score).toBe(80);
  });

  it("retient le domaine le plus faible", () => {
    const score = calculateVersatilityScore({
      combat: 95,
      support: 70,
      survival: 85,
      teamUtility: 90,
    });

    expect(score).toBe(70);
  });

  it("renvoie zéro si un domaine n'apporte aucune contribution", () => {
    const score = calculateVersatilityScore({
      combat: 90,
      support: 80,
      survival: 0,
      teamUtility: 75,
    });

    expect(score).toBe(0);
  });

  it("rejette les valeurs négatives", () => {
    expect(() =>
      calculateVersatilityScore({
        combat: -1,
        support: 80,
        survival: 80,
        teamUtility: 80,
      })
    ).toThrow("Performances FLEX invalides.");
  });

  it("rejette les valeurs supérieures à 100", () => {
    expect(() =>
      calculateVersatilityScore({
        combat: 101,
        support: 80,
        survival: 80,
        teamUtility: 80,
      })
    ).toThrow("Performances FLEX invalides.");
  });

  it("enregistre le score sans modifier les autres statistiques", () => {
    const player = createTestPlayer();

    const updated = recordFlexPerformance(player, {
      combat: 90,
      support: 75,
      survival: 85,
      teamUtility: 80,
    });

    expect(updated.stats.versatilityScore).toBe(75);
    expect(updated.stats.eliminations).toBe(0);
    expect(updated).not.toBe(player);
    expect(player.stats.versatilityScore).toBe(0);
  });
});
