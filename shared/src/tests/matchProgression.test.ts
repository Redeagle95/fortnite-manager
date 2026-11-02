
import { describe, it, expect } from "vitest";
import { applyMatchProgression } from "../engine/matchProgression";
import { createPlayerProgression } from "../engine/progression";
import {
  createPlayerStats,
  createPlayerWeaponStats,
} from "../engine/playerStats";

describe("matchProgression", () => {
  it("augmente la maîtrise du rôle actuel", () => {
    const progression = createPlayerProgression("FRAGGER");
    const stats = createPlayerStats();
    const weapons = createPlayerWeaponStats();

    stats.placement = 1;
    stats.eliminations = 3;
    stats.damageDealt = 200;

    const result = applyMatchProgression(
      progression,
      stats,
      weapons,
      1000
    );

    expect(
      result.progression.roles.find(
        (role) => role.role === "FRAGGER"
      )?.mastery
    ).toBeGreaterThan(0);
  });

  it("augmente uniquement la maîtrise des armes utilisées", () => {
    const progression = createPlayerProgression();
    const stats = createPlayerStats();
    const weapons = createPlayerWeaponStats();

    stats.placement = 5;

    weapons.SMG.shotsFired = 10;
    weapons.SMG.shotsHit = 7;
    weapons.SMG.damageDealt = 150;

    const result = applyMatchProgression(
      progression,
      stats,
      weapons,
      2000
    );

    const smg = result.progression.weapons.find(
      (weapon) => weapon.category === "SMG"
    );

    const sniper = result.progression.weapons.find(
      (weapon) => weapon.category === "SNIPER"
    );

    expect(smg?.mastery).toBeGreaterThan(0);
    expect(smg?.lastPracticedAt).toBe(2000);
    expect(sniper?.mastery).toBe(0);
    expect(sniper?.lastPracticedAt).toBeNull();
  });

  it("plafonne les maîtrises à 100", () => {
    const progression = createPlayerProgression("FRAGGER");

    progression.roles.find(
      (role) => role.role === "FRAGGER"
    )!.mastery = 99;

    const stats = createPlayerStats();
    const weapons = createPlayerWeaponStats();

    stats.placement = 1;
    stats.eliminations = 1000;
    stats.damageDealt = 100000;

    const result = applyMatchProgression(
      progression,
      stats,
      weapons,
      3000
    );

    expect(
      result.progression.roles.find(
        (role) => role.role === "FRAGGER"
      )?.mastery
    ).toBe(100);
  });

  it("refuse un placement manquant", () => {
    const progression = createPlayerProgression();
    const stats = createPlayerStats();
    const weapons = createPlayerWeaponStats();

    expect(() =>
      applyMatchProgression(
        progression,
        stats,
        weapons,
        4000
      )
    ).toThrow("Le placement du joueur est manquant.");
  });

  it("ne modifie pas la progression originale", () => {
    const progression = createPlayerProgression("FRAGGER");
    const stats = createPlayerStats();
    const weapons = createPlayerWeaponStats();

    stats.placement = 1;
    stats.eliminations = 5;

    const originalMastery = progression.roles.find(
      (role) => role.role === "FRAGGER"
    )!.mastery;

    applyMatchProgression(
      progression,
      stats,
      weapons,
      5000
    );

    expect(
      progression.roles.find(
        (role) => role.role === "FRAGGER"
      )?.mastery
    ).toBe(originalMastery);
  });

  it("refuse un horodatage invalide", () => {
    const progression = createPlayerProgression();
    const stats = createPlayerStats();
    const weapons = createPlayerWeaponStats();

    stats.placement = 1;

    expect(() =>
      applyMatchProgression(
        progression,
        stats,
        weapons,
        -1
      )
    ).toThrow("Horodatage invalide.");
  });
});
