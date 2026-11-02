
import type { MaterialType } from "./types";

export type BuildingType =
  | "WALL"
  | "FLOOR"
  | "STAIRS"
  | "ROOF";

export interface BuildingPiece {
  id: string;
  ownerId: string;
  type: BuildingType;
  material: MaterialType;
  health: number;
  maxHealth: number;
  x: number;
  y: number;
}

const BUILDING_COSTS: Record<MaterialType, number> = {
  WOOD: 10,
  STONE: 10,
  METAL: 10,
};

const BUILDING_HEALTH: Record<MaterialType, number> = {
  WOOD: 150,
  STONE: 300,
  METAL: 500,
};

export function createBuilding(
  id: string,
  ownerId: string,
  type: BuildingType,
  material: MaterialType,
  x: number,
  y: number
): BuildingPiece {
  const maxHealth = BUILDING_HEALTH[material];

  return {
    id,
    ownerId,
    type,
    material,
    health: maxHealth,
    maxHealth,
    x,
    y,
  };
}

export function getBuildingCost(
  material: MaterialType
): number {
  return BUILDING_COSTS[material];
}

export function damageBuilding(
  building: BuildingPiece,
  damage: number
): BuildingPiece | null {
  if (!Number.isFinite(damage) || damage < 0) {
    throw new Error("Dégâts de construction invalides.");
  }

  const health = Math.max(0, building.health - damage);

  if (health === 0) {
    return null;
  }

  return {
    ...building,
    health,
  };
}
