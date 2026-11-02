import { describe, expect, it } from "vitest";
import { advanceMatchTime, createBattleRoyale, getActionOptions, getFightProbability, getInventorySummary, resolveDrop, takeZoneAction } from "../battle-royale";

describe("Battle Royale simulation", () => {
  it("moves enemy squads on the map as the match advances", () => {
    const match = createBattleRoyale(4242, "DUO", "pine-woods");
    const before = match.teams.filter(team => !team.isUser).map(team => ({ id: team.id, x: team.position.x, y: team.position.y }));
    resolveDrop(match, { type: "LOOT" });
    const moved = before.some(position => {
      const team = match.teams.find(candidate => candidate.id === position.id)!;
      return team.position.x !== position.x || team.position.y !== position.y;
    });
    expect(moved).toBe(true);
  });

  it("farms to full or half materials and rotates early", () => {
    const full = createBattleRoyale(6101, "TRIO", "pine-woods");
    resolveDrop(full, { type: "LOOT" });
    takeZoneAction(full, { type: "FARM_FULL" });
    expect(full.userTeam.resources).toEqual({ wood: 500, stone: 500, metal: 500 });

    const half = createBattleRoyale(6102, "TRIO", "pine-woods");
    resolveDrop(half, { type: "LOOT" });
    const before = { ...half.userTeam.position };
    takeZoneAction(half, { type: "FARM_HALF_ROTATE" });
    expect(half.userTeam.resources).toEqual({ wood: 250, stone: 250, metal: 250 });
    expect(half.userTeam.position).not.toEqual(before);
  });

  it("records storm damage over live simulation time", () => {
    const match = createBattleRoyale(6103, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.position = { x: 9900, y: 9900 };
    match.storm = { x: 5000, y: 5000, radius: 100 };
    advanceMatchTime(match, 5);
    expect(match.stormDamageTaken).toBe(5);
    expect(match.userTeam.players[0].health).toBe(95);
  });

  it("adds surge tags to team damage progress", () => {
    const match = createBattleRoyale(6104, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    takeZoneAction(match, { type: "FARM_SURGE" });
    expect(match.userTeam.damageDealt).toBeGreaterThan(0);
    expect(match.events.some(item => item.type === "SURGE")).toBe(true);
  });

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
    expect(match.phaseIndex).toBe(2);
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
    const match = createBattleRoyale(321, "TRIO", "lake-outpost");
    resolveDrop(match, { type: "LOOT" });
    const target = match.userTeam.players[1];
    target.knocked = true;
    target.health = 0;
    takeZoneAction(match, { type: "REVIVE", playerId: target.id });
    expect(target.knocked).toBe(false);
    expect(target.alive).toBe(true);
    expect(target.health).toBeGreaterThan(0);
  });
  it("shrinks the storm over time and exposes late-game decisions", () => {
    const match = createBattleRoyale(888, "TRIO", "pine-woods");
    match.stage = "ZONE";
    match.phaseIndex = 1;
    match.stormTarget = { x: 5000, y: 5000, radius: 4200 };
    match.secondsUntilShrink = 150;
    match.secondsIntoShrink = 0;
    expect(match.storm.radius).toBe(5000);
    advanceMatchTime(match, 210);
    expect(match.storm.radius).toBe(4200);
    expect(match.phaseIndex).toBe(1);
    expect(getActionOptions(match).map(a => a.type)).toContain("FARM_FULL");
    match.phaseIndex = 4;
    expect(getActionOptions(match).map(a => a.type)).toEqual(expect.arrayContaining(["FIGHT_HEIGHT", "FIGHT_MID", "FIGHT_LOW", "FIGHT_OUTSIDE"]));
  });
  it("caps each material at 500", () => {
    const match = createBattleRoyale(889, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.resources.wood = 490;
    takeZoneAction(match, { type: "REFRESH", material: "WOOD" });
    expect(match.userTeam.resources.wood).toBeLessThanOrEqual(500);
  });

  it("uses weapon category synergy in final-zone estimates", () => {
    const match = createBattleRoyale(890, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.inventory.weapons = [{ id: "test-ar", definitionId: "assault-rifle", name: "Test AR", category: "ASSAULT_RIFLE", rarity: "LEGENDARY", damage: 45, magazine: 30, ammo: 30 }];
    expect(getFightProbability(match, "HEIGHT")).toBeGreaterThanOrEqual(getFightProbability(match, "LOW"));
  });

});
