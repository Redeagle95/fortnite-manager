import type { Rarity, WeaponCategory } from "./types";

export const RARITIES: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  COMMON: 0.82, UNCOMMON: 0.91, RARE: 1, EPIC: 1.12, LEGENDARY: 1.25, MYTHIC: 1.4,
};
export const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: "Commun", UNCOMMON: "Atypique", RARE: "Rare", EPIC: "Épique",
  LEGENDARY: "Légendaire", MYTHIC: "Mythique",
};
export interface WeaponDefinition { id: string; name: string; category: WeaponCategory; baseDamage: number; magazine: number; ammoType: string; }
export const WEAPONS: WeaponDefinition[] = [
  { id: "assault-rifle", name: "Fusil d'assaut", category: "ASSAULT_RIFLE", baseDamage: 30, magazine: 30, ammoType: "LIGHT" },
  { id: "burst-rifle", name: "Fusil à rafale", category: "ASSAULT_RIFLE", baseDamage: 34, magazine: 20, ammoType: "LIGHT" },
  { id: "scar", name: "Fusil d'assaut SCAR", category: "ASSAULT_RIFLE", baseDamage: 36, magazine: 30, ammoType: "LIGHT" },
  { id: "pump-shotgun", name: "Fusil à pompe", category: "SHOTGUN", baseDamage: 95, magazine: 5, ammoType: "SHELLS" },
  { id: "tactical-shotgun", name: "Fusil à pompe tactique", category: "SHOTGUN", baseDamage: 72, magazine: 8, ammoType: "SHELLS" },
  { id: "auto-shotgun", name: "Fusil à pompe automatique", category: "SHOTGUN", baseDamage: 68, magazine: 8, ammoType: "SHELLS" },
  { id: "bolt-sniper", name: "Fusil de précision à verrou", category: "SNIPER", baseDamage: 105, magazine:  boltMagazine(), ammoType: "HEAVY" },
  { id: "heavy-sniper", name: "Fusil de précision lourd", category: "SNIPER", baseDamage: 120, magazine: 1, ammoType: "HEAVY" },
  { id: "smg", name: "Mitraillette", category: "SMG", baseDamage: 20, magazine: 30, ammoType: "LIGHT" },
  { id: "rapid-smg", name: "Mitraillette rapide", category: "SMG", baseDamage: 18, magazine: 35, ammoType: "LIGHT" },
  { id: "pistol", name: "Pistolet", category: "PISTOL", baseDamage: 26, magazine: 16, ammoType: "LIGHT" },
  { id: "revolver", name: "Revolver", category: "PISTOL", baseDamage: 60, magazine: 6, ammoType: "MEDIUM" },
];
function boltMagazine(): number { return 1; }

export interface ConsumableDefinition {
  id: string; name: string; kind: "HEAL" | "UTILITY"; heal?: number;
  shield?: number; rarity: Rarity; maxStack: number;
}
export const CONSUMABLES: ConsumableDefinition[] = [
  { id: "bandage", name: "Bandage", kind: "HEAL", heal: 15, rarity: "COMMON", maxStack: 15 },
  { id: "medkit", name: "Kit de soin", kind: "HEAL", heal: 100, rarity: "UNCOMMON", maxStack: 3 },
  { id: "mini-shield", name: "Petite potion de bouclier", kind: "HEAL", shield: 25, rarity: "UNCOMMON", maxStack: 6 },
  { id: "shield-potion", name: "Potion de bouclier", kind: "HEAL", shield: 50, rarity: "RARE", maxStack: 3 },
  { id: "chug-splash", name: "Bombe empoisonnée de soin", kind: "HEAL", heal: 20, shield: 20, rarity: "RARE", maxStack: 6 },
  { id: "slurp-juice", name: "Jus de Slurp", kind: "HEAL", heal: 50, shield: 50, rarity: "EPIC", maxStack: 2 },
  { id: "fish", name: "Poisson", kind: "HEAL", heal: 40, rarity: "UNCOMMON", maxStack: 4 },
  { id: "shockwave", name: "Grenade à onde de choc", kind: "UTILITY", rarity: "RARE", maxStack: 6 },
  { id: "impulse", name: "Grenade à impulsion", kind: "UTILITY", rarity: "UNCOMMON", maxStack: 6 },
  { id: "grapple", name: "Objet de mobilité", kind: "UTILITY", rarity: "EPIC", maxStack: 3 },
];
export const AMMO_TYPES = ["LIGHT", "MEDIUM", "SHELLS", "HEAVY", "ROCKETS"] as const;
export const MATERIALS = ["WOOD", "STONE", "METAL"] as const;
