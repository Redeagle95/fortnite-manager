
import { describe, it, expect } from "vitest";
import {
  createMatch,
  finishMatch,
} from "../engine/match";
import { createPlayerProgression } from "../engine/progression";
import {
  createPlayerStats,
  createPlayerWeaponStats,
} from "../engine/playerStats";
import type { PlayerState } from "../engine/types";

function createTestPlayer(
  id: string,
  isBot: boolean
): PlayerState {
  const stats = createPlayerStats();

  stats.placement = 1;
  stats.eliminations = 5;
  stats.assists = 2;
  stats.damageDealt = 300;

  return {
    id,
    name: id,
    isBot,
    isAlive: false,
    health: 0,
    shield: 0,
    resources: {
      wood: 0,
      stone: 0,
      metal: 0,
    },
    stats,
    weaponStats: createPlayerWeaponStats(),
    progression: createPlayerProgression("FRAGGER"),
  };
}

function createRunningMatch(players: PlayerState[]) {
  return {
    ...createMatch("match-test", 12345, "SOLO"),
    status: "RUNNING" as const,
    players,
    startedAt: 1000,
  };
}

describe("match", () => {
  it("applique la progression aux joueurs humains", () => {
    const player = createTestPlayer("human-1", false);
    const match = createRunningMatch([player]);

    const result = finishMatch(match, 2000);

    const mastery = result.players[0].progression.roles.find(
      (role) => role.role === "FRAGGER"
    )?.mastery;

    expect(mastery).toBeGreaterThan(0);
    expect(result.status).toBe("FINISHED");
  });

  it("applique la progression aux bots", () => {
    const bot = createTestPlayer("bot-1", true);
    const match = createRunningMatch([bot]);

    const result = finishMatch(match, 2000);

    const mastery = result.players[0].progression.roles.find(
      (role) => role.role === "FRAGGER"
    )?.mastery;

    expect(mastery).toBeGreaterThan(0);
    expect(result.players[0].isBot).toBe(true);
  });

  it("applique la progression aux humains et aux bots", () => {
    const human = createTestPlayer("human-1", false);
    const bot = createTestPlayer("bot-1", true);
    const match = createRunningMatch([human, bot]);

    const result = finishMatch(match, 2000);

    for (const player of result.players) {
      const mastery = player.progression.roles.find(
        (role) => role.role === "FRAGGER"
      )?.mastery;

      expect(mastery).toBeGreaterThan(0);
    }
  });

  it("refuse un placement manquant", () => {
    const player = createTestPlayer("human-1", false);
    player.stats.placement = null;

    const match = createRunningMatch([player]);

    expect(() => finishMatch(match, 2000)).toThrow(
      "Le placement du joueur est manquant."
    );
  });

  it("refuse de terminer une partie déjà terminée", () => {
    const player = createTestPlayer("human-1", false);
    const match = createRunningMatch([player]);

    const finished = finishMatch(match, 2000);

    expect(() => finishMatch(finished, 3000)).toThrow(
      "La partie n'est pas en cours."
    );
  });

  it("ne modifie pas la partie initiale", () => {
    const player = createTestPlayer("human-1", false);
    const match = createRunningMatch([player]);

    const originalMastery = player.progression.roles.find(
      (role) => role.role === "FRAGGER"
    )!.mastery;

    const result = finishMatch(match, 2000);

    expect(match.status).toBe("RUNNING");
    expect(player.progression.roles.find(
      (role) => role.role === "FRAGGER"
    )!.mastery).toBe(originalMastery);

    expect(result.status).toBe("FINISHED");
  });
});
