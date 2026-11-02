
import type { MaterialType, PlayerResources } from "./types";

const MAX_RESOURCE = 500;

export function createResources(): PlayerResources {
  return {
    wood: 0,
    stone: 0,
    metal: 0,
  };
}

export function addResource(
  resources: PlayerResources,
  material: MaterialType,
  amount: number
): PlayerResources {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Quantité de ressources invalide.");
  }

  const updated = { ...resources };

  const key = material.toLowerCase() as keyof PlayerResources;

  updated[key] = Math.min(MAX_RESOURCE, updated[key] + amount);

  return updated;
}

export function spendResource(
  resources: PlayerResources,
  material: MaterialType,
  amount: number
): PlayerResources | null {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Quantité de ressources invalide.");
  }

  const key = material.toLowerCase() as keyof PlayerResources;

  if (resources[key] < amount) {
    return null;
  }

  return {
    ...resources,
    [key]: resources[key] - amount,
  };
}
