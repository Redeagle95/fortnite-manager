import { describe, expect, it } from "vitest";
import { createBattleRoyale, getActionOptions, getInventorySummary, resolveDrop, takeZoneAction } from "../battle-royale";

describe("Battle Royale simulation", () => {
  it("creates a full lobby and offers spawn decisions", () => {
    const match = createBattleRoyale(42, "TRIO", "tilted-district");
    expect(match.teams).toHaveLength(33);
    expect(match.playersRemaining).toBe(99);
    expect(match.userTeam.players).toHaveLength(3);
    expect(match.stage).toBe("DROP");
    expect(getActionOptions(match).map(a => a.type)).toEqual(["FIGHT", "LOOT", "ROTATE"]);
  });

  it("loots a spawn and advances through zone actions", () => {
    const match = createBattleRoyale(123, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    expect(match.stage).not.toBe("DROP");
    expect(getInventorySummary(match.userTeam).weapons.length).toBeLessThanOrEqual(5);
    takeZoneAction(match, { type: "REFRESH", material: "WOOD" });
    expect(match.userTeam.resources.wood).toBeGreaterThan(0);
    expect(match.phaseIndex).toBe(1);
  });

  it("rejects a second spawn decision", () => {
    const match = createBattleRoyale(7, "SOLO", "quiet-farm");
    resolveDrop(match, { type: "LOOT" });
    expect(() => resolveDrop(match, { type: "FIGHT" })).toThrow();
  });

  it("keeps every generated weapon rarity in the six-tier system", () => {
    const match = createBattleRoyale(99, "SQUAD", "red-factory");
    resolveDrop(match, { type: "LOOT" });
    for (const weapon of match.userTeam.inventory.weapons) {
      expect(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]).toContain(weapon.rarity);
    }
  });

  it("allows an active teammate to revive a knocked teammate", () => {
    const match = createBattleRoyale(321, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const target = match.userTeam.players[1];
    target.knocked = true;
    target.health = 0;
    takeZoneAction(match, { type: "REVIVE", playerId: target.id });
    expect(target.knocked).toBe(false);
    expect(target.alive).toBe(true);
    expect(target.health).toBeGreaterThan(0);
  });
});
