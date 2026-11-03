import { describe, expect, it } from "vitest";
import { SeededRandom } from "../engine/random";
import {
  calculateDropContestations,
  calculateJumpTiming,
  createDropPlan,
  generateBusTrajectory,
  getBusPositionAtTime,
  getPoiSubzones,
} from "../battle-royale/earlyGame";
import { BATTLE_ROYALE_MAP } from "../battle-royale/map";
import { createBattleRoyale } from "../battle-royale/engine";

describe("Early-game drop planning", () => {
  it("generates a bus route that starts and ends on different island edges", () => {
    const route = generateBusTrajectory(new SeededRandom(1001), 10000, 10000);
    const onEdge = (point: { x: number; y: number }) =>
      point.x === 0 || point.x === 10000 || point.y === 0 || point.y === 10000;
    expect(onEdge(route.start)).toBe(true);
    expect(onEdge(route.end)).toBe(true);
    expect(route.start).not.toEqual(route.end);
    expect(route.durationSeconds).toBeGreaterThan(0);
  });

  it("interpolates the bus position and clamps time to the route", () => {
    const route = {
      start: { x: 0, y: 0 },
      end: { x: 1000, y: 500 },
      speed: 100,
      durationSeconds: 10,
    };
    expect(getBusPositionAtTime(route, 5)).toEqual({ x: 500, y: 250 });
    expect(getBusPositionAtTime(route, -10)).toEqual({ x: 0, y: 0 });
    expect(getBusPositionAtTime(route, 20)).toEqual({ x: 1000, y: 500 });
  });

  it("calculates a jump window before the bus reaches the closest point to a POI", () => {
    const route = {
      start: { x: 0, y: 5000 },
      end: { x: 10000, y: 5000 },
      speed: 1000,
      durationSeconds: 10,
    };
    const poi = BATTLE_ROYALE_MAP.locations.find(location => location.id === "tilted-district")!;
    const timing = calculateJumpTiming(poi, route, 2);
    expect(timing.jumpAtSeconds).toBeGreaterThanOrEqual(0);
    expect(timing.landingAtSeconds - timing.jumpAtSeconds).toBe(2);
    expect(timing.distanceFromBus).toBeLessThan(3000);
  });

  it("creates three distinct tactical subzones for each POI", () => {
    const poi = BATTLE_ROYALE_MAP.locations[0];
    const subzones = getPoiSubzones(poi);
    expect(subzones).toHaveLength(3);
    expect(new Set(subzones.map(subzone => subzone.id)).size).toBe(3);
    expect(subzones.map(subzone => subzone.type)).toEqual(["CENTER", "ROOFTOPS", "PERIPHERY"]);
  });

  it("keeps the chosen player POI while selecting a tactical subzone", () => {
    const match = createBattleRoyale(777, "DUO", "pine-woods");
    const userPlan = match.dropPlans.find(plan => plan.teamId === match.userTeam.id)!;
    expect(userPlan.locationId).toBe("pine-woods");
    expect(match.userTeam.dropLocationId).toBe("pine-woods");
    expect(match.userTeam.dropSubzoneId).toBe(userPlan.subzoneId);
  });

  it("uses the same seeded route and drop plans for the same match seed", () => {
    const first = createBattleRoyale(778, "TRIO", "quiet-farm");
    const second = createBattleRoyale(778, "TRIO", "quiet-farm");
    expect(first.busTrajectory).toEqual(second.busTrajectory);
    expect(first.dropPlans).toEqual(second.dropPlans);
    expect(first.contestations).toEqual(second.contestations);
  });

  it("records real POI contestations with arrival spread and risk", () => {
    const plans = [
      { teamId: "a", locationId: "poi", subzoneId: "poi:center", jumpAtSeconds: 0, landingAtSeconds: 12, distanceFromBus: 0, score: 50, reason: "" },
      { teamId: "b", locationId: "poi", subzoneId: "poi:center", jumpAtSeconds: 2, landingAtSeconds: 14, distanceFromBus: 0, score: 45, reason: "" },
      { teamId: "c", locationId: "other", subzoneId: "other:center", jumpAtSeconds: 0, landingAtSeconds: 12, distanceFromBus: 0, score: 40, reason: "" },
    ];
    const contestations = calculateDropContestations(plans);
    expect(contestations).toHaveLength(1);
    expect(contestations[0].teamIds).toEqual(["a", "b"]);
    expect(contestations[0].arrivalSpreadSeconds).toBe(2);
    expect(contestations[0].risk).toBe("HIGH");
  });

  it("assigns a drop plan to every squad in the lobby", () => {
    const match = createBattleRoyale(779, "SOLO", "pine-woods");
    expect(match.dropPlans).toHaveLength(100);
    expect(match.dropPlans.every(plan => match.teams.some(team => team.id === plan.teamId))).toBe(true);
    expect(match.teams.every(team => Boolean(team.dropSubzoneId))).toBe(true);
  });

  it("scores a location using the squad's strategy and role skills", () => {
    const match = createBattleRoyale(780, "SQUAD", "pine-woods");
    const team = match.userTeam;
    const route = match.busTrajectory;
    const randomA = new SeededRandom(42);
    const randomB = new SeededRandom(42);
    const cautious = createDropPlan({ ...team, strategy: "PRUDENT" }, BATTLE_ROYALE_MAP.locations, route, randomA);
    const aggressive = createDropPlan({ ...team, strategy: "AGGRESSIVE" }, BATTLE_ROYALE_MAP.locations, route, randomB);
    expect(cautious.teamId).toBe(team.id);
    expect(aggressive.teamId).toBe(team.id);
    expect(BATTLE_ROYALE_MAP.locations.some(location => location.id === cautious.locationId)).toBe(true);
    expect(BATTLE_ROYALE_MAP.locations.some(location => location.id === aggressive.locationId)).toBe(true);
  });
});
