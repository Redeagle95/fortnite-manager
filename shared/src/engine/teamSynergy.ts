import type { PlayerRole } from "./progression";
import type { GameMode } from "./types";

export type SynergyEffect =
  | "LEADERSHIP_CONFLICT"
  | "LOW_OFFENSIVE_PRESSURE"
  | "LOW_TEAM_SUPPORT";

export interface TeamRoleComposition {
  playerId: string;
  role: PlayerRole;
}

export interface TeamSynergyResult {
  effects: SynergyEffect[];
  score: number;
}

export function detectRoleEffects(
  composition: TeamRoleComposition[]
): SynergyEffect[] {
  const roleCounts: Record<PlayerRole, number> = {
    IGL: 0,
    FRAGGER: 0,
    SUPPORT: 0,
    FLEX: 0,
  };

  for (const player of composition) {
    roleCounts[player.role]++;
  }

  const effects: SynergyEffect[] = [];

  if (roleCounts.IGL > 1) {
    effects.push("LEADERSHIP_CONFLICT");
  }

  if (roleCounts.FRAGGER > 1) {
    effects.push("LOW_TEAM_SUPPORT");
  }

  if (roleCounts.SUPPORT > 1) {
    effects.push("LOW_OFFENSIVE_PRESSURE");
  }

  return effects;
}