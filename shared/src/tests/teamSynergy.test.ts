import { describe, it, expect } from "vitest";
import { detectRoleEffects } from "../engine/teamSynergy";

describe("Team Synergy", () => {
  it("ne détecte aucun malus sans doublon", () => {
    const effects = detectRoleEffects([
      { playerId: "1", role: "IGL" },
      { playerId: "2", role: "FRAGGER" },
      { playerId: "3", role: "SUPPORT" },
      { playerId: "4", role: "FLEX" },
    ]);

    expect(effects).toEqual([]);
  });

  it("détecte deux IGL", () => {
    const effects = detectRoleEffects([
      { playerId: "1", role: "IGL" },
      { playerId: "2", role: "IGL" },
    ]);

    expect(effects).toContain("LEADERSHIP_CONFLICT");
  });

  it("détecte deux FRAGGERS", () => {
    const effects = detectRoleEffects([
      { playerId: "1", role: "FRAGGER" },
      { playerId: "2", role: "FRAGGER" },
    ]);

    expect(effects).toContain("LOW_TEAM_SUPPORT");
  });

  it("détecte deux SUPPORTS", () => {
    const effects = detectRoleEffects([
      { playerId: "1", role: "SUPPORT" },
      { playerId: "2", role: "SUPPORT" },
    ]);

    expect(effects).toContain("LOW_OFFENSIVE_PRESSURE");
  });

  it("n'applique aucun malus automatique à deux FLEX", () => {
    const effects = detectRoleEffects([
      { playerId: "1", role: "FLEX" },
      { playerId: "2", role: "FLEX" },
    ]);

    expect(effects).toEqual([]);
  });
});