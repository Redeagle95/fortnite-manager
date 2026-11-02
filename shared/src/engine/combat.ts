
import { SeededRandom } from "./random";
import { calculateSuccessProbability } from "./probability";

export type CombatResult =
  | "SUCCESS"
  | "PARTIAL_SUCCESS"
  | "FAILURE"
  | "CRITICAL_FAILURE";

export interface CombatInput {
  attackerSkill: number;
  weaponPower: number;
  positioning: number;
  health: number;
  opponentSkill: number;
}

export interface CombatOutcome {
  result: CombatResult;
  successProbability: number;
}

export function resolveCombat(
  input: CombatInput,
  random: SeededRandom
): CombatOutcome {
  const successProbability = calculateSuccessProbability({
    skill: input.attackerSkill,
    weapon: input.weaponPower,
    positioning: input.positioning,
    health: input.health,
    opponent: input.opponentSkill,
  });

  const roll = random.next() * 100;

  let result: CombatResult;

  if (roll < successProbability * 0.65) {
    result = "SUCCESS";
  } else if (roll < successProbability) {
    result = "PARTIAL_SUCCESS";
  } else if (roll < 95) {
    result = "FAILURE";
  } else {
    result = "CRITICAL_FAILURE";
  }

  return {
    result,
    successProbability,
  };
}
