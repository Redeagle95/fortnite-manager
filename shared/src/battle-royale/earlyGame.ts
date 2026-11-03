import type { BattleTeam, MapLocation, TeamStrategy } from "./types";
import type { SeededRandom } from "../engine/random";

export type DropSubzoneType = "CENTER" | "ROOFTOPS" | "PERIPHERY";
export type ContestRisk = "LOW" | "MEDIUM" | "HIGH";

export interface BusTrajectory {
  start: { x: number; y: number };
  end: { x: number; y: number };
  speed: number;
  durationSeconds: number;
}

export interface DropSubzone {
  id: string;
  locationId: string;
  name: string;
  type: DropSubzoneType;
  x: number;
  y: number;
  lootQualityMultiplier: number;
  lootAmountMultiplier: number;
  resourceMultiplier: number;
  cover: number;
}

export interface DropPlan {
  teamId: string;
  locationId: string;
  subzoneId: string;
  jumpAtSeconds: number;
  landingAtSeconds: number;
  distanceFromBus: number;
  score: number;
  reason: string;
}

export interface DropContestation {
  locationId: string;
  teamIds: string[];
  arrivalSpreadSeconds: number;
  risk: ContestRisk;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Creates a seeded bus route between two different island edges. */
export function generateBusTrajectory(
  random: SeededRandom,
  width: number,
  height: number,
  speed = 900,
): BusTrajectory {
  const sideA = random.nextInt(0, 3);
  let sideB = random.nextInt(0, 3);
  while (sideB === sideA) sideB = (sideB + 1) % 4;

  const edgePoint = (side: number) => {
    if (side === 0) return { x: 0, y: random.nextInt(500, height - 500) };
    if (side === 1) return { x: width, y: random.nextInt(500, height - 500) };
    if (side === 2) return { x: random.nextInt(500, width - 500), y: 0 };
    return { x: random.nextInt(500, width - 500), y: height };
  };

  const start = edgePoint(sideA);
  const end = edgePoint(sideB);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  return { start, end, speed, durationSeconds: distance / speed };
}

/** Returns the bus position at a clamped point in its flight. */
export function getBusPositionAtTime(trajectory: BusTrajectory, seconds: number): { x: number; y: number } {
  const progress = trajectory.durationSeconds <= 0
    ? 1
    : clamp(seconds / trajectory.durationSeconds, 0, 1);
  return {
    x: trajectory.start.x + (trajectory.end.x - trajectory.start.x) * progress,
    y: trajectory.start.y + (trajectory.end.y - trajectory.start.y) * progress,
  };
}

function projectOntoBusPath(point: { x: number; y: number }, trajectory: BusTrajectory) {
  const dx = trajectory.end.x - trajectory.start.x;
  const dy = trajectory.end.y - trajectory.start.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared === 0
    ? 0
    : clamp(((point.x - trajectory.start.x) * dx + (point.y - trajectory.start.y) * dy) / lengthSquared, 0, 1);
  const projected = {
    x: trajectory.start.x + dx * progress,
    y: trajectory.start.y + dy * progress,
  };
  return { progress, distance: Math.hypot(point.x - projected.x, point.y - projected.y) };
}

export function calculateJumpTiming(
  location: Pick<MapLocation, "x" | "y">,
  trajectory: BusTrajectory,
  descentSeconds = 12,
): { jumpAtSeconds: number; landingAtSeconds: number; distanceFromBus: number } {
  const projection = projectOntoBusPath(location, trajectory);
  const closestBusTime = projection.progress * trajectory.durationSeconds;
  const jumpAtSeconds = Math.max(0, closestBusTime - descentSeconds);
  return {
    jumpAtSeconds,
    landingAtSeconds: jumpAtSeconds + descentSeconds,
    distanceFromBus: projection.distance,
  };
}

/** Three tactical landing areas are generated for each POI. */
export function getPoiSubzones(location: MapLocation): DropSubzone[] {
  return [
    {
      id: `${location.id}:center`, locationId: location.id, name: "Centre du POI", type: "CENTER",
      x: location.x, y: location.y, lootQualityMultiplier: 1.08, lootAmountMultiplier: 1.15,
      resourceMultiplier: 0.9, cover: 62,
    },
    {
      id: `${location.id}:rooftops`, locationId: location.id, name: "Toits et hauteurs", type: "ROOFTOPS",
      x: clamp(location.x - 105, 0, 10000), y: clamp(location.y + 90, 0, 10000),
      lootQualityMultiplier: 1.15, lootAmountMultiplier: 0.85, resourceMultiplier: 0.75, cover: 48,
    },
    {
      id: `${location.id}:periphery`, locationId: location.id, name: "Périphérie", type: "PERIPHERY",
      x: clamp(location.x + 135, 0, 10000), y: clamp(location.y - 110, 0, 10000),
      lootQualityMultiplier: 0.88, lootAmountMultiplier: 0.95, resourceMultiplier: 1.25, cover: 78,
    },
  ];
}

function strategyPreference(strategy: TeamStrategy, location: MapLocation): number {
  switch (strategy) {
    case "AGGRESSIVE": return location.danger * 0.32 + location.lootQuality * 0.12;
    case "PRUDENT": return (100 - location.danger) * 0.28 + location.resourceRichness * 0.12;
    case "OPPORTUNISTIC": return location.lootQuality * 0.2 + location.lootAmount * 2 - location.danger * 0.08;
    default: return location.lootQuality * 0.16 + location.resourceRichness * 0.1 - location.danger * 0.12;
  }
}

export function createDropPlan(
  team: Pick<BattleTeam, "id" | "strategy" | "players">,
  locations: MapLocation[],
  trajectory: BusTrajectory,
  random: SeededRandom,
  forcedLocationId?: string,
): DropPlan {
  if (!locations.length) throw new Error("Aucun POI disponible pour le drop.");
  const scout = team.players.find(player => player.role === "SCOUT" && player.alive);
  const igl = team.players.find(player => player.role === "IGL" && player.alive);
  const candidates = (forcedLocationId
    ? locations.filter(location => location.id === forcedLocationId)
    : locations
  ).flatMap(location => getPoiSubzones(location).map(subzone => {
    const timing = calculateJumpTiming(subzone, trajectory);
    const distancePenalty = timing.distanceFromBus / 180;
    const dangerPenalty = team.strategy === "AGGRESSIVE" ? location.danger * 0.06 : location.danger * 0.2;
    const lootValue = location.lootQuality * subzone.lootQualityMultiplier * 0.22
      + location.lootAmount * subzone.lootAmountMultiplier * 1.4;
    const resourceValue = location.resourceRichness * subzone.resourceMultiplier * 0.08;
    const scoutBonus = scout ? scout.skills.gameSense * 0.035 : 0;
    const leadershipBonus = igl ? igl.skills.decisionMaking * 0.018 : 0;
    const score = lootValue + resourceValue + strategyPreference(team.strategy, location)
      + scoutBonus + leadershipBonus + subzone.cover * (team.strategy === "PRUDENT" ? 0.08 : 0.025)
      - dangerPenalty - distancePenalty;
    return { location, subzone, timing, score };
  }));

  if (!candidates.length) throw new Error(`POI de drop inconnu : ${forcedLocationId}`);
  const ranked = candidates.sort((a, b) => b.score - a.score);
  const pool = ranked.slice(0, Math.min(4, ranked.length));
  const weights = pool.map((candidate, index) => Math.max(1, (pool.length - index) ** 2));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random.next() * totalWeight;
  let selected = pool[pool.length - 1];
  for (let index = 0; index < pool.length; index++) {
    roll -= weights[index];
    if (roll <= 0) { selected = pool[index]; break; }
  }

  const reason = forcedLocationId
    ? "Destination choisie par le joueur ; sous-zone optimisée selon le loot et la trajectoire du bus."
    : `Choix ${team.strategy.toLowerCase()} : score tactique ${selected.score.toFixed(1)}, danger ${selected.location.danger}/100.`;
  return {
    teamId: team.id,
    locationId: selected.location.id,
    subzoneId: selected.subzone.id,
    jumpAtSeconds: selected.timing.jumpAtSeconds,
    landingAtSeconds: selected.timing.landingAtSeconds,
    distanceFromBus: selected.timing.distanceFromBus,
    score: Number(selected.score.toFixed(2)),
    reason,
  };
}

export function calculateDropContestations(plans: DropPlan[]): DropContestation[] {
  const byLocation = new Map<string, DropPlan[]>();
  for (const plan of plans) {
    const group = byLocation.get(plan.locationId) ?? [];
    group.push(plan);
    byLocation.set(plan.locationId, group);
  }

  return [...byLocation.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([locationId, group]) => {
      const arrivals = group.map(plan => plan.landingAtSeconds);
      const spread = Math.max(...arrivals) - Math.min(...arrivals);
      const distinctSubzones = new Set(group.map(plan => plan.subzoneId)).size;
      const adjustedSpread = spread + (distinctSubzones === group.length ? 8 : 0);
      return {
        locationId,
        teamIds: group.map(plan => plan.teamId),
        arrivalSpreadSeconds: Number(spread.toFixed(2)),
        risk: adjustedSpread <= 8 ? "HIGH" : adjustedSpread <= 18 ? "MEDIUM" : "LOW",
      };
    });
}
