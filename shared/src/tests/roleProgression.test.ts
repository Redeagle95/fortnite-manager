
import { describe, it, expect } from "vitest";
import {
  calculateRoleMasteryGain,
  applyRoleMasteryGain,
  calculateRoleProgression,
} from "../engine/roleProgression";

const performance = {
  placement: 1,
  eliminations: 5,
  assists: 3,
  damageDealt: 500,
  healingGiven: 200,
  revives: 2,
  healingItemsDistributed: 3,
  survivalContribution: 50,
  versatilityScore: 80,
};

describe("Role Progression", () => {
  it("calcule une progression pour les quatre rôles", () => {
    for (const role of ["IGL", "FRAGGER", "SUPPORT", "FLEX"] as const) {
      const gain = calculateRoleMasteryGain(role, performance);
      expect(gain).toBeGreaterThan(0);
      expect(gain).toBeLessThanOrEqual(5);
    }
  });

  it("plafonne la maîtrise à 100", () => {
    expect(applyRoleMasteryGain(98, 5)).toBe(100);
  });

  it("ne dépasse pas la maîtrise maximale", () => {
    const result = calculateRoleProgression(
      "FRAGGER",
      99,
      performance
    );

    expect(result.newMastery).toBe(100);
    expect(result.gain).toBe(1);
  });

  it("rejette une performance invalide", () => {
    expect(() =>
      calculateRoleMasteryGain("IGL", {
        ...performance,
        placement: 0,
      })
    ).toThrow();
  });

  it("rejette une maîtrise supérieure à 100", () => {
    expect(() => applyRoleMasteryGain(101, 1)).toThrow();
  });

  it("respecte les paramètres configurables", () => {
    const gain = calculateRoleMasteryGain(
      "FRAGGER",
      performance,
      {
        minGainPerMatch: 0,
        maxGainPerMatch: 2,
      }
    );

    expect(gain).toBe(2);
  });
});
