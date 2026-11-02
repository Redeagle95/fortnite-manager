
import type { MaterialType } from "./types";
import type { Position } from "./movement";
import { calculateDistance } from "./movement";

export interface ResourceNode {
  id: string;
  material: MaterialType;
  position: Position;
  remaining: number;
  maxAmount: number;
}

export interface GatheringResult {
  node: ResourceNode;
  collected: number;
}

export function createResourceNode(
  id: string,
  material: MaterialType,
  position: Position,
  amount: number
): ResourceNode {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Quantité de ressources invalide.");
  }

  return {
    id,
    material,
    position,
    remaining: amount,
    maxAmount: amount,
  };
}

export function gatherResource(
  node: ResourceNode,
  playerPosition: Position,
  amount: number,
  maxDistance: number
): GatheringResult {
  if (
    !Number.isInteger(amount) ||
    amount < 0 ||
    !Number.isFinite(maxDistance) ||
    maxDistance < 0
  ) {
    throw new Error("Paramètres de récolte invalides.");
  }

  const distance = calculateDistance(
    playerPosition,
    node.position
  );

  if (distance > maxDistance) {
    throw new Error("Le joueur est trop loin de la ressource.");
  }

  const collected = Math.min(amount, node.remaining);

  return {
    node: {
      ...node,
      remaining: node.remaining - collected,
    },
    collected,
  };
}
