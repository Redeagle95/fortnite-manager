
import { describe, it, expect } from "vitest";
import {
  createHealth,
  applyDamage,
  addShield,
  heal,
} from "../engine/health";

describe("HealthEngine", () => {
  it("crée un joueur avec 100 PV et 0 bouclier", () => {
    expect(createHealth()).toEqual({
      health: 100,
      shield: 0,
      isAlive: true,
    });
  });

  it("absorbe les dégâts avec le bouclier en premier", () => {
    const result = applyDamage(
      { health: 100, shield: 50, isAlive: true },
      30
    );

    expect(result.state).toEqual({
      health: 100,
      shield: 20,
      isAlive: true,
    });

    expect(result.damageToShield).toBe(30);
    expect(result.damageToHealth).toBe(0);
  });

  it("retire les PV lorsque le bouclier est épuisé", () => {
    const result = applyDamage(
      { health: 100, shield: 20, isAlive: true },
      50
    );

    expect(result.state).toEqual({
      health: 70,
      shield: 0,
      isAlive: true,
    });

    expect(result.damageToShield).toBe(20);
    expect(result.damageToHealth).toBe(30);
  });

  it("limite le bouclier à 100", () => {
    const result = addShield(
      { health: 100, shield: 80, isAlive: true },
      50
    );

    expect(result.shield).toBe(100);
  });

  it("limite les PV à 100", () => {
    const result = heal(
      { health: 70, shield: 0, isAlive: true },
      50
    );

    expect(result.health).toBe(100);
  });

  it("élimine un joueur lorsque ses PV atteignent zéro", () => {
    const result = applyDamage(
      { health: 30, shield: 0, isAlive: true },
      30
    );

    expect(result.state.isAlive).toBe(false);
    expect(result.state.health).toBe(0);
    expect(result.eliminated).toBe(true);
  });
});
