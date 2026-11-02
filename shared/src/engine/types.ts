
import type { PlayerProgression } from "./progression";

export type GameMode = "SOLO" | "DUO" | "TRIO" | "SQUAD";

export type MaterialType = "WOOD" | "STONE" | "METAL";

export type WeaponType =
  | "ASSAULT_RIFLE"
  | "SHOTGUN"
  | "SMG"
  | "SNIPER"
  | "PISTOL";

export interface PlayerResources {
  wood: number;
  stone: number;
  metal: number;
}

export interface PlayerStats {
  eliminations: number;
  assists: number;
  damageDealt: number;
  placement: number | null;

  healingGiven: number;
  revives: number;
  healingItemsDistributed: number;
  survivalContribution: number;

  versatilityScore: number;
}

export interface WeaponMatchStats {
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  eliminations: number;
  timeUsedMinutes: number;
}

export type PlayerWeaponStats = Record<WeaponType, WeaponMatchStats>;

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  isAlive: boolean;

  health: number;
  shield: number;

  resources: PlayerResources;
  stats: PlayerStats;
  weaponStats: PlayerWeaponStats;

  progression: PlayerProgression;
}

export interface MatchState {
  id: string;
  seed: number;
  mode: GameMode;
  status: "WAITING" | "RUNNING" | "FINISHED";

  players: PlayerState[];

  startedAt: number | null;
  finishedAt: number | null;
}
