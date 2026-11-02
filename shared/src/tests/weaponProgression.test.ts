
import { describe, it, expect } from "vitest";
import {
  calculateWeaponMasteryGain,
  applyWeaponMasteryGain,
  calculateWeaponProgression,
} from "../engine/weaponProgression";

const performance = {
  shotsFired: 100,
  shotsHit: 60,
  damageDealt: 500,
  eliminations: 5,
  timeUsedMinutes: 20,
};

describe("Weapon Progression", () => {
  it("calcule une progression positive", () => {
    const gain = calculateWeaponMasteryGain(performance);

    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThanOrEqual(5);
  });

  it("plafonne la maîtrise à 100", () => {
    expect(applyWeaponMasteryGain(98, 5)).toBe(100);
  });

  it("ne dépasse pas la maîtrise maximale", () => {
    const result = calculateWeaponProgression(
      "SNIPER",
      99,
      performance
    );

    expect(result.newMastery).toBe(100);
    expect(result.gain).toBe(1);
  });

  it("rejette plus de tirs touchés que de tirs effectués", () => {
    expect(() =>
      calculateWeaponMasteryGain({
        ...performance,
        shotsHit: 110,
      })
    ).toThrow();
  });

  it("rejette une maîtrise supérieure à 100", () => {
    expect(() => applyWeaponMasteryGain(101, 1)).toThrow();
  });

  it("respecte les paramètres configurables", () => {
    const gain = calculateWeaponMasteryGain(
      performance,
      {
        minGainPerMatch: 0,
        maxGainPerMatch: 2,
      }
    );

    expect(gain).toBe(2);
  });

  it("conserve la catégorie d'arme dans le résultat", () => {
    const result = calculateWeaponProgression(
      "SHOTGUN",
      20,
      performance
    );

    expect(result.category).toBe("SHOTGUN");
  });
});
