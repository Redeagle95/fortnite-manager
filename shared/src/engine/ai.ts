
import { SeededRandom } from "./random";

export type BotDifficulty =
  | "BEGINNER"
  | "EASY"
  | "MEDIUM"
  | "HARD"
  | "PRO";

export type BotAction =
  | "LOOT"
  | "GATHER"
  | "MOVE_TO_ZONE"
  | "ATTACK"
  | "BUILD"
  | "HEAL"
  | "RETREAT";

export interface BotContext {
  health: number;
  shield: number;
  hasWeapon: boolean;
  hasHealing: boolean;
  insideStorm: boolean;
  enemyNearby: boolean;
  resources: number;
}

const DIFFICULTY_SKILL: Record<BotDifficulty, number> = {
  BEGINNER: 20,
  EASY: 35,
  MEDIUM: 55,
  HARD: 75,
  PRO: 95,
};

export function getBotSkill(
  difficulty: BotDifficulty
): number {
  return DIFFICULTY_SKILL[difficulty];
}

export function chooseBotAction(
  context: BotContext,
  difficulty: BotDifficulty,
  random: SeededRandom
): BotAction {
  if (context.health <= 0) {
    throw new Error("Un bot éliminé ne peut pas agir.");
  }

  if (context.insideStorm) {
    return "MOVE_TO_ZONE";
  }

  if (
    context.health <= 40 &&
    context.hasHealing
  ) {
    return "HEAL";
  }

  if (
    context.enemyNearby &&
    context.health + context.shield >= 60
  ) {
    const aggression = getBotSkill(difficulty) / 100;

    if (random.chance(aggression)) {
      return "ATTACK";
    }

    return "RETREAT";
  }

  if (!context.hasWeapon) {
    return "LOOT";
  }

  if (context.resources < 30) {
    return "GATHER";
  }

  if (context.enemyNearby) {
    return "BUILD";
  }

  return "MOVE_TO_ZONE";
}
