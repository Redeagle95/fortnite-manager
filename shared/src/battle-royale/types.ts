export type BattleMode = "SOLO" | "DUO" | "TRIO" | "SQUAD";
export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
export type WeaponCategory = "ASSAULT_RIFLE" | "SHOTGUN" | "SNIPER" | "SMG" | "PISTOL";
export type Material = "WOOD" | "STONE" | "METAL";
export type MatchStage = "DROP" | "LOOT" | "ZONE" | "FINISHED";
export type TacticalStyle = "HEIGHT" | "MID" | "LOW" | "OUTSIDE";
export type TeamStrategy = "PRUDENT" | "AGGRESSIVE" | "STRATEGIC" | "OPPORTUNISTIC";
export type PlayerRole = "IGL" | "FRAGGER" | "SUPPORT" | "SCOUT";
export type ActionType = "FARM_FULL" | "FARM_HALF_ROTATE" | "FARM_SURGE" | "FIGHT" | "FIGHT_THEN_ROTATE" | "FIGHT_HEIGHT" | "FIGHT_MID" | "FIGHT_LOW" | "FIGHT_OUTSIDE" | "LOOT" | "REFRESH" | "ROTATE" | "HEAL" | "HOLD_POSITION" | "REVIVE" | "FOCUS_FIRE" | "BOXFIGHT" | "DISENGAGE" | "PICKUP_LOOT";

export interface PlayerSkill {
  aim: number; building: number; gameSense: number; positioning: number;
  decisionMaking: number; teamwork: number; overall: number;
}
export interface BattlePlayer {
  id: string; name: string; skills: PlayerSkill; role: PlayerRole; eliminations: number; damageDealt: number; alive: boolean;
  health: number; shield: number; knocked: boolean;
}
export interface WeaponInstance {
  id: string; definitionId: string; name: string; category: WeaponCategory;
  rarity: Rarity; damage: number; magazine: number; ammo: number;
}
export interface ItemStack {
  definitionId: string; name: string; rarity: Rarity; quantity: number;
  kind: "HEAL" | "UTILITY"; heal?: number; shield?: number;
}
export interface Inventory {
  weapons: WeaponInstance[]; items: ItemStack[]; ammo: Record<string, number>;
  maxWeaponSlots: number;
}
export interface Resources { wood: number; stone: number; metal: number; }
export interface BattleTeam {
  id: string; name: string; isUser: boolean; players: BattlePlayer[];
  inventory: Inventory; resources: Resources; eliminations: number; strategy: TeamStrategy;
  placement: number | null; dropLocationId: string; alive: boolean;
  position: { x: number; y: number }; builds: number; damageDealt: number;
}
export interface MapLocation {
  id: string; name: string; x: number; y: number; lootQuality: number;
  lootAmount: number; resourceRichness: number; danger: number;
  tags: string[];
}
export interface StormCircle { x: number; y: number; radius: number; }
export interface ZonePhase {
  phase: number; radius: number; waitSeconds: number;
  shrinkSeconds: number; damagePerSecond: number;
}
export interface LootDrop {
  id: string; kind: "WEAPON" | "HEAL" | "UTILITY" | "AMMO" | "MATERIAL";
  name: string; rarity: Rarity; quantity: number; definitionId?: string;
  category?: WeaponCategory; damage?: number; material?: Material;
}
export interface BattleEvent {
  id: string; phase: number; type: "DROP" | "LOOT" | "FIGHT" | "ROTATE" | "REFRESH" | "FARM" | "SURGE" | "HEAL" | "STORM" | "ELIMINATION" | "INFO";
  title: string; description: string; createdAt: number;
}
export interface BattleMatch {
  id: string; seed: number; mode: BattleMode; stage: MatchStage;
  map: { name: string; width: number; height: number; locations: MapLocation[] };
  userTeam: BattleTeam; teams: BattleTeam[]; selectedDropId: string;
  currentLocationId: string; storm: StormCircle; stormTarget: StormCircle; phases: ZonePhase[];
  phaseIndex: number; secondsUntilShrink: number; secondsIntoShrink: number; mobileZoneActive: boolean;
  gameTimeSeconds: number; stormDamageTaken: number; surgeDamageTaken: number; surgeThreshold: number; stormSurgeActive: boolean; lastSurgePulse: number;
  lootOnGround: LootDrop[]; events: BattleEvent[]; teamsRemaining: number;
  playersRemaining: number; startedAt: number; finishedAt: number | null;
  finalPlacement: number | null; placementPoints: number; eliminationPoints: number; totalPoints: number; result: "WIN" | "ELIMINATED" | null;
}
export type BattleAction =
  | { type: "FARM_FULL" }
  | { type: "FARM_HALF_ROTATE"; locationId?: string }
  | { type: "FARM_SURGE" }
  | { type: "FIGHT"; style?: TacticalStyle }
  | { type: "FIGHT_THEN_ROTATE"; locationId?: string }
  | { type: "FIGHT_HEIGHT" }
  | { type: "FIGHT_MID" }
  | { type: "FIGHT_LOW" }
  | { type: "FIGHT_OUTSIDE" }
  | { type: "LOOT" }
  | { type: "REFRESH"; material?: Material }
  | { type: "ROTATE"; locationId?: string }
  | { type: "HEAL"; playerId?: string; itemDefinitionId?: string }
  | { type: "HOLD_POSITION" }
  | { type: "REVIVE"; playerId?: string }
  | { type: "FOCUS_FIRE"; targetPlayerId?: string }
  | { type: "BOXFIGHT" }
  | { type: "DISENGAGE"; locationId?: string }
  | { type: "PICKUP_LOOT"; dropId: string; replaceWeaponId?: string };
export interface FightReport {
  winProbability: number; won: boolean; enemyTeamName: string;
  enemyEliminations: number; allyLosses: number; summary: string;
}
