
import { describe, it, expect } from "vitest";
import { resolveCombat } from "../engine/combat";
import { SeededRandom } from "../engine/random";

describe("CombatEngine", () => {
  const strongAttacker = {
    attackerSkill: 95,
    weaponPower: 95,
    positioning: 95,
    health: 100,
    opponentSkill: 10,
  };

  const weakAttacker = {
    attackerSkill: 5,
    weaponPower: 5,
    positioning: 5,
    health: 10,
    opponentSkill: 100,
  };

  it("produit une probabilité de réussite valide", () => {
    const result = resolveCombat(
      strongAttacker,
      new SeededRandom(123)
    );

    expect(result.successProbability).toBeGreaterThanOrEqual(1);
    expect(result.successProbability).toBeLessThanOrEqual(99);
  });

  it("produit le même résultat avec la même seed", () => {
    const first = resolveCombat(
      strongAttacker,
      new SeededRandom(123)
    );

    const second = resolveCombat(
      strongAttacker,
      new SeededRandom(123)
    );

    expect(first).toEqual(second);
  });

  it("permet une réussite avec un attaquant très fort", () => {
    const result = resolveCombat(
      strongAttacker,
      new SeededRandom(1)
    );

    expect(result.result).toBe("SUCCESS");
  });

it("permet un échec avec un attaquant très faible", () => {
  const result = resolveCombat(
    weakAttacker,
    new SeededRandom(123456)
  );

  expect(result.result).toBe("FAILURE");
});
});
