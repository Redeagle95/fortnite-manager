
import type {
  GameMode,
  MatchState,
  PlayerState,
} from "./types";

import { applyMatchProgression } from "./matchProgression";

export function getMaxPlayers(mode: GameMode): number {
  return mode === "TRIO" ? 99 : 100;
}

export function createMatch(
  id: string,
  seed: number,
  mode: GameMode
): MatchState {
  if (!id.trim()) {
    throw new Error("Identifiant de partie invalide.");
  }

  if (!Number.isInteger(seed)) {
    throw new Error("La seed doit être un entier.");
  }

  return {
    id,
    seed,
    mode,
    status: "WAITING",
    players: [],
    startedAt: null,
    finishedAt: null,
  };
}

export function addPlayer(
  match: MatchState,
  player: PlayerState
): MatchState {
  if (match.status !== "WAITING") {
    throw new Error("La partie a déjà commencé.");
  }

  if (match.players.length >= getMaxPlayers(match.mode)) {
    throw new Error("La partie est complète.");
  }

  if (match.players.some((p) => p.id === player.id)) {
    throw new Error("Ce joueur est déjà dans la partie.");
  }

  return {
    ...match,
    players: [...match.players, player],
  };
}

export function startMatch(
  match: MatchState,
  timestamp: number
): MatchState {
  if (match.status !== "WAITING") {
    throw new Error("Impossible de démarrer cette partie.");
  }

  if (match.players.length !== getMaxPlayers(match.mode)) {
    throw new Error("Le nombre de participants est incorrect.");
  }

  if (!Number.isFinite(timestamp)) {
    throw new Error("Horodatage invalide.");
  }

  return {
    ...match,
    status: "RUNNING",
    startedAt: timestamp,
  };
}

export function finishMatch(
  match: MatchState,
  timestamp: number
): MatchState {
  if (match.status !== "RUNNING") {
    throw new Error("La partie n'est pas en cours.");
  }

  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error("Horodatage invalide.");
  }

  const updatedPlayers = match.players.map((player) => {
    const result = applyMatchProgression(
      player.progression,
      player.stats,
      player.weaponStats,
      timestamp
    );

    return {
      ...player,
      progression: result.progression,
    };
  });

  return {
    ...match,
    players: updatedPlayers,
    status: "FINISHED",
    finishedAt: timestamp,
  };
}
