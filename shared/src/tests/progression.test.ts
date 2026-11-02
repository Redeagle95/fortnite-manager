
import { describe, it, expect } from "vitest";
import {
  createPlayerProgression,
  changePlayerRole,
} from "../engine/progression";

describe("PlayerProgression", () => {
  it("crée un joueur avec un potentiel général de 100", () => {
    const player = createPlayerProgression();

    expect(player.overallPotential).toBe(100);
  });

  it("initialise tous les rôles à 0", () => {
    const player = createPlayerProgression();

    expect(player.roles).toHaveLength(4);
    expect(player.roles.every((role) => role.mastery === 0)).toBe(true);
  });

  it("initialise toutes les maîtrises d'armes à 0", () => {
    const player = createPlayerProgression();

    expect(player.weapons).toHaveLength(5);
    expect(player.weapons.every((weapon) => weapon.mastery === 0)).toBe(true);
  });

  it("initialise les six compétences de training à 0", () => {
    const player = createPlayerProgression();

    expect(player.training).toHaveLength(6);
    expect(player.training.every((skill) => skill.level === 0)).toBe(true);
  });

  it("donne un potentiel de 100 à chaque compétence de training", () => {
    const player = createPlayerProgression();

    expect(player.training.every((skill) => skill.potential === 100)).toBe(true);
  });

  it("utilise FRAGGER et BALANCED par défaut", () => {
    const player = createPlayerProgression();

    expect(player.currentRole).toBe("FRAGGER");
    expect(player.playStyle).toBe("BALANCED");
  });
});

describe("RoleChange", () => {
  it("change de rôle dans le lobby", () => {
    const player = createPlayerProgression("FRAGGER");

    const result = changePlayerRole(
      player,
      "IGL",
      true,
      true,
      1000
    );

    expect(result).toBe("SUCCESS");
    expect(player.currentRole).toBe("IGL");
  });

  it("retire 25 % de maîtrise à l'ancien rôle", () => {
    const player = createPlayerProgression("FRAGGER");
    player.roles.find((role) => role.role === "FRAGGER")!.mastery = 80;

    changePlayerRole(player, "IGL", true, true, 1000);

    expect(
      player.roles.find((role) => role.role === "FRAGGER")!.mastery
    ).toBe(60);
  });

  it("refuse le changement hors du lobby", () => {
    const player = createPlayerProgression();

    const result = changePlayerRole(player, "IGL", false, true);

    expect(result).toBe("NOT_IN_LOBBY");
  });

  it("refuse un changement sans confirmation", () => {
    const player = createPlayerProgression();

    const result = changePlayerRole(player, "IGL", true, false);

    expect(result).toBe("NOT_CONFIRMED");
  });

  it("refuse de choisir le rôle déjà actif", () => {
    const player = createPlayerProgression("FRAGGER");

    const result = changePlayerRole(player, "FRAGGER", true, true);

    expect(result).toBe("SAME_ROLE");
  });
});
