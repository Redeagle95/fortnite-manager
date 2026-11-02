
import { describe, it, expect } from "vitest";
import {
  createResources,
  addResource,
  spendResource,
} from "../engine/resources";

describe("ResourceEngine", () => {
  it("crée des ressources à zéro", () => {
    expect(createResources()).toEqual({
      wood: 0,
      stone: 0,
      metal: 0,
    });
  });

  it("ajoute des ressources", () => {
    const resources = addResource(
      createResources(),
      "WOOD",
      100
    );

    expect(resources.wood).toBe(100);
  });

  it("ne dépasse jamais 500 matériaux", () => {
    const resources = addResource(
      createResources(),
      "WOOD",
      700
    );

    expect(resources.wood).toBe(500);
  });

  it("permet de dépenser des matériaux", () => {
    const resources = addResource(
      createResources(),
      "STONE",
      100
    );

    const result = spendResource(resources, "STONE", 40);

    expect(result?.stone).toBe(60);
  });

  it("refuse une dépense impossible", () => {
    const result = spendResource(
      createResources(),
      "METAL",
      50
    );

    expect(result).toBeNull();
  });
});
