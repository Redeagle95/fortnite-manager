import { describe, expect, it } from "vitest";
import { advanceBattleBus, createBattleRoyale, jumpBattleBus, setBattleBusDestination } from "../battle-royale/engine";

describe("Battle Bus tactical phase", () => {
  it("creates one shared route and a separate plan for every team", () => {
    const match = createBattleRoyale(7301, "SQUAD", "tilted-district");
    expect(match.bus.trajectory.start).not.toEqual(match.bus.trajectory.end);
    expect(match.bus.plans).toHaveLength(25);
    expect(match.bus.plans.find(plan => plan.teamId === match.userTeam.id)?.destinationId).toBe("tilted-district");
    expect(match.bus.status).toBe("IN_PROGRESS");
  });

  it("allows the player to change destination before jumping", () => {
    const match = createBattleRoyale(7302, "TRIO", "tilted-district");
    setBattleBusDestination(match, "pine-woods");
    expect(match.userTeam.dropLocationId).toBe("pine-woods");
    expect(match.selectedDropId).toBe("pine-woods");
    expect(match.bus.plans.find(plan => plan.teamId === match.userTeam.id)?.destinationId).toBe("pine-woods");
  });

  it("lets the player override the IGL timing and land after descent", () => {
    const match = createBattleRoyale(7303, "DUO", "quiet-farm");
    jumpBattleBus(match);
    const userPlan = match.bus.plans.find(plan => plan.teamId === match.userTeam.id)!;
    expect(userPlan.status).toBe("DESCENDING");
    expect(userPlan.jumpedAtSeconds).toBe(0);
    advanceBattleBus(match, 100);
    expect(userPlan.status).toBe("LANDED");
    expect(userPlan.landedAtSeconds).not.toBeNull();
    expect(match.bus.status).toBe("COMPLETE");
  });

  it("automatically follows the IGL jump timing for every AI squad", () => {
    const match = createBattleRoyale(7304, "SOLO", "dusty-yard");
    const userPlan = match.bus.plans.find(plan => plan.teamId === match.userTeam.id)!;
    advanceBattleBus(match, Math.ceil(userPlan.jumpAtSeconds) + 1);
    expect(userPlan.status).not.toBe("ON_BUS");
    expect(match.bus.elapsedSeconds).toBeGreaterThan(0);
  });

  it("assigns tactical landing zones and applies a skill-based landing offset", () => {
    const match = createBattleRoyale(7306, "SQUAD", "tilted-district");
    const userPlan = match.bus.plans.find(plan => plan.teamId === match.userTeam.id)!;
    expect(userPlan.landingZone).toBe("ROOFTOPS");
    expect(userPlan.landingError).toBeGreaterThanOrEqual(0);

    setBattleBusDestination(match, "pine-woods", "OUTSKIRTS");
    expect(userPlan.landingZone).toBe("OUTSKIRTS");
    expect(userPlan.landingOffset).not.toEqual({ x: 0, y: 0 });

    jumpBattleBus(match);
    advanceBattleBus(match, 100);
    const destination = match.map.locations.find(location => location.id === "pine-woods")!;
    expect(match.userTeam.position.x).toBe(destination.x + userPlan.landingOffset.x);
    expect(match.userTeam.position.y).toBe(destination.y + userPlan.landingOffset.y);
  });

  it("gives AI teams a landing subzone based on their strategy", () => {
    const match = createBattleRoyale(7307, "SOLO", "dusty-yard");
    expect(match.bus.plans.every(plan => ["CENTER", "ROOFTOPS", "OUTSKIRTS"].includes(plan.landingZone))).toBe(true);
  });

  it("does not allow changing destination after the team has jumped", () => {
    const match = createBattleRoyale(7305, "DUO", "red-factory");
    jumpBattleBus(match);
    expect(() => setBattleBusDestination(match, "pine-woods")).toThrow();
  });
});
