import type { MapLocation, StormCircle, ZonePhase } from "./types";
import { SeededRandom } from "../engine/random";

export const BATTLE_ROYALE_MAP = {
  name: "Island Royale",
  width: 10000,
  height: 10000,
  locations: [
    { id: "neo-harbor", name: "Port Néo", x: 1700, y: 1800, lootQuality: 78, lootAmount: 9, resourceRichness: 62, danger: 72, tags: ["ville", "coffres", "port"] },
    { id: "tilted-district", name: "District Central", x: 5000, y: 2600, lootQuality: 96, lootAmount: 12, resourceRichness: 78, danger: 98, tags: ["ville", "hot drop", "coffres"] },
    { id: "pine-woods", name: "Bois des Pins", x: 2300, y: 4900, lootQuality: 52, lootAmount: 5, resourceRichness: 98, danger: 28, tags: ["forêt", "bois", "calme"] },
    { id: "dusty-yard", name: "Dépôt Poussiéreux", x: 4800, y: 5000, lootQuality: 82, lootAmount: 8, resourceRichness: 90, danger: 66, tags: ["industriel", "métal"] },
    { id: "sunny-shore", name: "Rivage Solaire", x: 7900, y: 2300, lootQuality: 68, lootAmount: 7, resourceRichness: 48, danger: 44, tags: ["plage", "coffres"] },
    { id: "crown-hill", name: "Colline de la Couronne", x: 7600, y: 5400, lootQuality: 75, lootAmount: 6, resourceRichness: 65, danger: 58, tags: ["hauteur", "position"] },
    { id: "frost-peak", name: "Pic du Givre", x: 5000, y: 7900, lootQuality: 72, lootAmount: 7, resourceRichness: 70, danger: 38, tags: ["montagne", "pierre"] },
    { id: "quiet-farm", name: "Ferme Tranquille", x: 1900, y: 7900, lootQuality: 58, lootAmount: 6, resourceRichness: 74, danger: 22, tags: ["ferme", "calme"] },
    { id: "red-factory", name: "Usine Rouge", x: 8100, y: 8100, lootQuality: 88, lootAmount: 10, resourceRichness: 96, danger: 80, tags: ["industriel", "métal", "hot drop"] },
    { id: "lake-outpost", name: "Avant-poste du Lac", x: 5000, y: 5000, lootQuality: 64, lootAmount: 6, resourceRichness: 58, danger: 42, tags: ["lac", "rotation"] },
  ] satisfies MapLocation[],
};
export const ZONE_PHASES: ZonePhase[] = [
  { phase: 1, radius: 4200, waitSeconds: 150, shrinkSeconds: 60, damagePerSecond: 1 },
  { phase: 2, radius: 3000, waitSeconds: 120, shrinkSeconds: 55, damagePerSecond: 1 },
  { phase: 3, radius: 2100, waitSeconds: 100, shrinkSeconds: 50, damagePerSecond: 2 },
  { phase: 4, radius: 1400, waitSeconds: 85, shrinkSeconds: 45, damagePerSecond: 5 },
  { phase: 5, radius: 900, waitSeconds: 70, shrinkSeconds: 40, damagePerSecond: 8 },
  { phase: 6, radius: 550, waitSeconds: 55, shrinkSeconds: 35, damagePerSecond: 10 },
  { phase: 7, radius: 280, waitSeconds: 35, shrinkSeconds: 30, damagePerSecond: 15 },
  { phase: 8, radius: 90, waitSeconds: 20, shrinkSeconds: 25, damagePerSecond: 20 },
];
export function isInsideStorm(x: number, y: number, circle: StormCircle): boolean {
  return Math.hypot(x - circle.x, y - circle.y) <= circle.radius;
}
export function nextStormCircle(previous: StormCircle, radius: number, random: SeededRandom): StormCircle {
  const maxOffset = Math.max(0, previous.radius - radius);
  const angle = random.next() * Math.PI * 2;
  const distance = random.next() * maxOffset * 0.8;
  return { x: previous.x + Math.cos(angle) * distance, y: previous.y + Math.sin(angle) * distance, radius };
}
