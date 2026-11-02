
import { describe, it, expect } from "vitest";
import { SeededRandom } from "../engine/random";

describe("SeededRandom", () => {
  it("produit les mêmes résultats avec la même seed", () => {
    const random1 = new SeededRandom(12345);
    const random2 = new SeededRandom(12345);

    for (let i = 0; i < 10; i++) {
      expect(random1.next()).toBe(random2.next());
    }
  });

  it("produit des nombres entre 0 et 1", () => {
    const random = new SeededRandom(54321);

    for (let i = 0; i < 100; i++) {
      const value = random.next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("respecte les limites de nextInt", () => {
    const random = new SeededRandom(98765);

    for (let i = 0; i < 100; i++) {
      const value = random.nextInt(1, 10);

      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it("refuse une seed invalide", () => {
    expect(() => new SeededRandom(1.5)).toThrow();
  });
});
