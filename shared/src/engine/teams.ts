
import type { GameMode } from "./types";

export interface Team {
  id: string;
  playerIds: string[];
}

export function getTeamSize(mode: GameMode): number {
  switch (mode) {
    case "SOLO":
      return 1;
    case "DUO":
      return 2;
    case "TRIO":
      return 3;
    case "SQUAD":
      return 4;
  }
}

export function createTeam(
  id: string,
  playerIds: string[],
  mode: GameMode
): Team {
  const teamSize = getTeamSize(mode);

  if (!id.trim()) {
    throw new Error("Identifiant d'équipe invalide.");
  }

  if (playerIds.length !== teamSize) {
    throw new Error(
      `Une équipe ${mode} doit contenir ${teamSize} joueur(s).`
    );
  }

  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Un joueur ne peut pas apparaître deux fois.");
  }

  return {
    id,
    playerIds: [...playerIds],
  };
}
