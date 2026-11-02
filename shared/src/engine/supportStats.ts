
import type { PlayerState } from "./types";

function validateAmount(amount: number, label: string): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} invalide.`);
  }
}

export function recordHealingGiven(
  player: PlayerState,
  amount: number
): PlayerState {
  validateAmount(amount, "Soins");

  return {
    ...player,
    stats: {
      ...player.stats,
      healingGiven: player.stats.healingGiven + amount,
    },
  };
}

export function recordRevive(player: PlayerState): PlayerState {
  return {
    ...player,
    stats: {
      ...player.stats,
      revives: player.stats.revives + 1,
    },
  };
}

export function recordHealingItemDistributed(
  player: PlayerState,
  quantity: number = 1
): PlayerState {
  validateAmount(quantity, "Quantité d'objets de soin");

  if (!Number.isInteger(quantity)) {
    throw new Error("La quantité doit être un entier.");
  }

  return {
    ...player,
    stats: {
      ...player.stats,
      healingItemsDistributed:
        player.stats.healingItemsDistributed + quantity,
    },
  };
}

export function recordSurvivalContribution(
  player: PlayerState,
  amount: number
): PlayerState {
  validateAmount(amount, "Contribution à la survie");

  return {
    ...player,
    stats: {
      ...player.stats,
      survivalContribution:
        player.stats.survivalContribution + amount,
    },
  };
}
