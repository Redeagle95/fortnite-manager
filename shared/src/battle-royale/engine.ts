import { SeededRandom } from "../engine/random";
import { CONSUMABLES, RARITIES, RARITY_MULTIPLIER, WEAPONS } from "./catalog";
import { BATTLE_ROYALE_MAP, isInsideStorm, nextStormCircle, ZONE_PHASES } from "./map";
import type { ActionType, BattleAction, BattleEvent, BattleMatch, BattlePlayer, BattleTeam, FightReport, Inventory, ItemStack, LootDrop, MapLocation, Material, PlayerSkill, Resources, Rarity, WeaponInstance } from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const TEAM_SIZE: Record<BattleMatch["mode"], number> = { SOLO: 1, DUO: 2, TRIO: 3, SQUAD: 4 };
const rarityWeights: Array<[Rarity, number]> = [["COMMON", 38], ["UNCOMMON", 27], ["RARE", 18], ["EPIC", 10], ["LEGENDARY", 5], ["MYTHIC", 2]];

function rarityRoll(random: SeededRandom): Rarity {
  const roll = random.next() * 100;
  let cursor = 0;
  for (const [rarity, weight] of rarityWeights) { cursor += weight; if (roll < cursor) return rarity; }
  return "MYTHIC";
}
function createSkills(random: SeededRandom, base?: number): PlayerSkill {
  const overall = base ?? random.nextInt(48, 94);
  return {
    overall,
    aim: clamp(overall + random.nextInt(-12, 12)),
    building: clamp(overall + random.nextInt(-16, 14)),
    gameSense: clamp(overall + random.nextInt(-10, 12)),
    positioning: clamp(overall + random.nextInt(-12, 12)),
    decisionMaking: clamp(overall + random.nextInt(-10, 10)),
    teamwork: clamp(overall + random.nextInt(-14, 14)),
  };
}
function createInventory(): Inventory { return { weapons: [], items: [], ammo: {}, maxWeaponSlots: 5 }; }
function createTeam(id: string, name: string, isUser: boolean, mode: BattleMatch["mode"], locationId: string, x: number, y: number, random: SeededRandom, skillBase?: number, playerRatings?: number[]): BattleTeam {
  const players: BattlePlayer[] = Array.from({ length: TEAM_SIZE[mode] }, (_, i) => ({
    id: `${id}-p${i + 1}`, name: isUser ? (i === 0 ? "Toi" : `Mate ${i}`) : `${name} ${i + 1}`,
    skills: createSkills(random, playerRatings?.[i] ?? skillBase), alive: true, health: 100, shield: 0, knocked: false,
  }));
  return { id, name, isUser, players, inventory: createInventory(), resources: { wood: 0, stone: 0, metal: 0 }, eliminations: 0, placement: null, dropLocationId: locationId, alive: true, position: { x, y }, builds: 0, damageDealt: 0 };
}
function event(match: BattleMatch, type: BattleEvent["type"], title: string, description: string): BattleEvent {
  const item = { id: `event-${match.events.length + 1}`, phase: match.phaseIndex, type, title, description, createdAt: Date.now() };
  match.events.unshift(item); return item;
}
function alivePlayers(team: BattleTeam): BattlePlayer[] { return team.players.filter(p => p.alive); }
function activePlayers(team: BattleTeam): BattlePlayer[] { return team.players.filter(p => p.alive && !p.knocked); }
function aliveTeams(match: BattleMatch): BattleTeam[] { return match.teams.filter(t => t.alive); }
function isFinished(match: BattleMatch): boolean { return match.stage === "FINISHED"; }
function updateCounts(match: BattleMatch): void {
  match.teamsRemaining = aliveTeams(match).length;
  match.playersRemaining = match.teams.reduce((sum, team) => sum + alivePlayers(team).length, 0);
  if (!match.userTeam.alive) finishMatch(match, "ELIMINATED");
  else if (match.teamsRemaining === 1 && match.userTeam.alive) finishMatch(match, "WIN");
}
function finishMatch(match: BattleMatch, result: "WIN" | "ELIMINATED"): void {
  match.stage = "FINISHED"; match.result = result; match.finishedAt = Date.now();
  match.finalPlacement = result === "WIN" ? 1 : Math.max(1, match.teamsRemaining + 1);
  match.userTeam.placement = match.finalPlacement;
}
function pickLocation(random: SeededRandom): MapLocation {
  return BATTLE_ROYALE_MAP.locations[random.nextInt(0, BATTLE_ROYALE_MAP.locations.length - 1)];
}
function makeDrop(match: BattleMatch, location: MapLocation, random: SeededRandom): LootDrop[] {
  const drops: LootDrop[] = [];
  const count = Math.max(2, location.lootAmount + random.nextInt(-2, 3));
  for (let i = 0; i < count; i++) {
    const roll = random.next();
    if (roll < 0.58) {
      const weapon = WEAPONS[random.nextInt(0, WEAPONS.length - 1)];
      const rarity = rarityRoll(random);
      drops.push({ id: `loot-${match.lootOnGround.length + drops.length + 1}`, kind: "WEAPON", name: weapon.name, definitionId: weapon.id, category: weapon.category, rarity, damage: Math.round(weapon.baseDamage * RARITY_MULTIPLIER[rarity]), quantity: 1 });
    } else if (roll < 0.83) {
      const item = CONSUMABLES[random.nextInt(0, CONSUMABLES.length - 1)];
      drops.push({ id: `loot-${match.lootOnGround.length + drops.length + 1}`, kind: item.kind, name: item.name, definitionId: item.id, rarity: item.rarity, quantity: random.nextInt(1, 2) });
    } else if (roll < 0.93) {
      drops.push({ id: `loot-${match.lootOnGround.length + drops.length + 1}`, kind: "AMMO", name: "Munitions", rarity: "COMMON", quantity: random.nextInt(20, 60) });
    } else {
      const material = (["WOOD", "STONE", "METAL"] as Material[])[random.nextInt(0, 2)];
      drops.push({ id: `loot-${match.lootOnGround.length + drops.length + 1}`, kind: "MATERIAL", name: material, material, rarity: "COMMON", quantity: random.nextInt(20, 50) });
    }
  }
  return drops;
}
function collectLoot(team: BattleTeam, drops: LootDrop[]): { collected: LootDrop[]; remaining: LootDrop[] } {
  const collected: LootDrop[] = [];
  const remaining: LootDrop[] = [];
  for (const drop of drops) {
    if (drop.kind === "WEAPON" && team.inventory.weapons.length < team.inventory.maxWeaponSlots) {
      team.inventory.weapons.push({ id: drop.id, definitionId: drop.definitionId!, name: drop.name, category: drop.category!, rarity: drop.rarity, damage: drop.damage!, magazine: 30, ammo: 30 }); collected.push(drop);
    } else if (drop.kind === "HEAL" || drop.kind === "UTILITY") {
      const existing = team.inventory.items.find(i => i.definitionId === drop.definitionId);
      if (existing) existing.quantity += drop.quantity;
      else {
        const def = CONSUMABLES.find(i => i.id === drop.definitionId)!;
        team.inventory.items.push({ definitionId: def.id, name: def.name, rarity: def.rarity, quantity: drop.quantity, kind: def.kind, heal: def.heal, shield: def.shield });
      }
      collected.push(drop);
    } else if (drop.kind === "AMMO") {
      team.inventory.ammo.LIGHT = (team.inventory.ammo.LIGHT ?? 0) + drop.quantity; collected.push(drop);
    } else if (drop.kind === "MATERIAL" && drop.material) {
      team.resources[drop.material.toLowerCase() as keyof Resources] = Math.min(500, team.resources[drop.material.toLowerCase() as keyof Resources] + drop.quantity); collected.push(drop);
    } else remaining.push(drop);
  }
  return { collected, remaining };
}
function styleWeaponBonus(team: BattleTeam, style?: "HEIGHT" | "MID" | "LOW" | "OUTSIDE"): number {
  if (!style || !team.inventory.weapons.length) return 0;
  const weights = style === "HEIGHT"
    ? { ASSAULT_RIFLE: 1.25, SNIPER: 1.5, SHOTGUN: 0.55, SMG: 0.65, PISTOL: 0.7 }
    : style === "MID"
      ? { ASSAULT_RIFLE: 1.0, SNIPER: 0.55, SHOTGUN: 1.5, SMG: 1.0, PISTOL: 0.75 }
      : style === "LOW"
        ? { ASSAULT_RIFLE: 0.8, SNIPER: 0.45, SHOTGUN: 1.15, SMG: 1.5, PISTOL: 0.9 }
        : { ASSAULT_RIFLE: 1.1, SNIPER: 1.35, SHOTGUN: 0.65, SMG: 0.85, PISTOL: 0.75 };
  const best = team.inventory.weapons.map(weapon => Math.min(100, weapon.damage / 1.2) * weights[weapon.category]).sort((a, b) => b - a).slice(0, 3);
  const weaponScore = best.reduce((sum, score) => sum + score, 0) / best.length;
  const utility = team.inventory.items.filter(item => item.kind === "UTILITY").reduce((sum, item) => sum + item.quantity, 0);
  return Math.min(15, weaponScore * 0.12 + (style === "OUTSIDE" ? Math.min(5, utility * 1.5) : 0));
}
function teamPower(team: BattleTeam, style?: "HEIGHT" | "MID" | "LOW" | "OUTSIDE"): number {
  const players = activePlayers(team); if (!players.length) return 0;
  const skill = players.reduce((sum, p) => sum + (p.skills.overall * 0.25 + p.skills.aim * 0.18 + p.skills.building * 0.18 + p.skills.gameSense * 0.16 + p.skills.positioning * 0.12 + p.skills.teamwork * 0.11), 0) / players.length;
  const weapon = team.inventory.weapons.length ? team.inventory.weapons.reduce((sum, w) => sum + w.damage, 0) / team.inventory.weapons.length / 1.2 : 15;
  const gear = clamp(weapon, 10, 100);
  const health = players.reduce((sum, p) => sum + p.health + p.shield * 0.6, 0) / players.length / 2;
  const buildBonus = Math.min(12, team.builds * 1.5) + Math.min(10, (team.resources.wood + team.resources.stone + team.resources.metal) / 100);
  return skill * 0.65 + gear * 0.2 + health * 0.1 + buildBonus * 0.05 + styleWeaponBonus(team, style);
}
function findEnemy(match: BattleMatch, preferredLocation?: string): BattleTeam | undefined {
  const enemies = match.teams.filter(t => !t.isUser && t.alive);
  if (!enemies.length) return undefined;
  const nearby = enemies.filter(t => t.dropLocationId === (preferredLocation ?? match.currentLocationId));
  const pool = nearby.length ? nearby : enemies;
  return pool.sort((a, b) => Math.hypot(a.position.x - match.userTeam.position.x, a.position.y - match.userTeam.position.y) - Math.hypot(b.position.x - match.userTeam.position.x, b.position.y - match.userTeam.position.y))[0];
}
function eliminatePlayer(player: BattlePlayer): void { player.alive = false; player.health = 0; player.shield = 0; player.knocked = false; }
export function getFightProbability(match: BattleMatch, style?: "HEIGHT" | "MID" | "LOW" | "OUTSIDE"): number {
  const enemy = findEnemy(match, match.stage === "DROP" ? match.selectedDropId : match.currentLocationId);
  if (!enemy) return 100;
  const userPower = teamPower(match.userTeam, style);
  const enemyPower = teamPower(enemy);
  const positioning = style === "HEIGHT" ? 7 : style === "MID" ? 3 : style === "LOW" ? 1 : style === "OUTSIDE" ? -2 : 0;
  const buildAdvantage = Math.min(8, match.userTeam.resources.wood / 80 + match.userTeam.resources.stone / 100);
  return Math.round(clamp(50 + (userPower - enemyPower) * 0.72 + positioning + buildAdvantage, 5, 95));
}
function fight(match: BattleMatch, random: SeededRandom, style?: "HEIGHT" | "MID" | "LOW" | "OUTSIDE"): FightReport {
  const enemy = findEnemy(match, match.stage === "DROP" ? match.selectedDropId : match.currentLocationId);
  if (!enemy) return { winProbability: 100, won: true, enemyTeamName: "Personne", enemyEliminations: 0, allyLosses: 0, summary: "Aucun adversaire sur ce spot : ton équipe sécurise la zone." };
  const winProbability = getFightProbability(match, style);
  const won = random.next() * 100 < winProbability;
  const enemyAlive = alivePlayers(enemy);
  const allies = activePlayers(match.userTeam);
  const enemyEliminations = won ? enemyAlive.length : random.nextInt(0, Math.max(1, enemyAlive.length - 1));
  const allyLosses = won ? (random.next() < 0.12 ? 1 : 0) : Math.min(allies.length, random.nextInt(1, Math.max(1, allies.length)));
  const userKiller = activePlayers(match.userTeam)[0];
  for (let i = 0; i < enemyEliminations; i++) {
    const victim = enemyAlive[i];
    eliminatePlayer(victim);
    event(match, "ELIMINATION", "Élimination", `${userKiller?.name ?? match.userTeam.name} (${match.userTeam.name}) élimine ${victim.name} (${enemy.name}).`);
  }
  if (enemyEliminations > 0) match.userTeam.eliminations += enemyEliminations;
  match.userTeam.damageDealt += enemyEliminations * 100 + (won ? 80 : 35);
  for (let i = 0; i < allyLosses; i++) {
    const downed = allies[allies.length - 1 - i];
    downed.knocked = true; downed.health = 0; downed.shield = 0;
  }
  if (!activePlayers(match.userTeam).length && match.userTeam.players.some(player => player.knocked && player.alive)) {
    const enemyKiller = activePlayers(enemy)[0];
    for (const player of match.userTeam.players.filter(player => player.knocked && player.alive)) {
      eliminatePlayer(player);
      event(match, "ELIMINATION", "Élimination", `${enemyKiller?.name ?? enemy.name} (${enemy.name}) élimine ${player.name} (${match.userTeam.name}).`);
    }
  }
  if (!alivePlayers(enemy).length) { enemy.alive = false; enemy.placement = match.teamsRemaining; }
  if (!alivePlayers(match.userTeam).length) match.userTeam.alive = false;
  const styleLabel = style ? ({ HEIGHT: "hauteur", MID: "milieu", LOW: "bas", OUTSIDE: "hors zone" }[style]) : "standard";
  const summary = won ? "Victoire contre " + enemy.name + " en jouant " + styleLabel + " ! " + enemyEliminations + " adversaire(s) éliminé(s)." : "Combat perdu contre " + enemy.name + " en jouant " + styleLabel + ". " + allyLosses + " mate(s) à terre.";
  event(match, "FIGHT", won ? "Combat remporté" : "Combat perdu", summary);
  return { winProbability, won, enemyTeamName: enemy.name, enemyEliminations, allyLosses, summary };
}
function refresh(team: BattleTeam, location: MapLocation, random: SeededRandom, requested?: Material): number {
  const materials: Material[] = requested ? [requested] : ["WOOD", "STONE", "METAL"];
  let gained = 0;
  for (const material of materials) {
    const key = material.toLowerCase() as keyof Resources;
    const amount = Math.round(location.resourceRichness / 3 + random.nextInt(10, 35));
    const actual = Math.min(amount, 500 - team.resources[key]);
    team.resources[key] += actual; gained += actual;
  }
  team.builds += 1;
  return gained;
}

function farmToTarget(team: BattleTeam, target: number): number {
  let gained = 0;
  for (const material of ["wood", "stone", "metal"] as const) {
    const amount = Math.max(0, Math.min(500, target) - team.resources[material]);
    team.resources[material] += amount;
    gained += amount;
  }
  team.builds += Math.ceil(gained / 150);
  return gained;
}

function farmSurgeTags(match: BattleMatch, random: SeededRandom): number {
  const enemy = findEnemy(match);
  if (!enemy) {
    event(match, "SURGE", "Aucun angle de tir", "Aucune équipe adverse n'est à portée : impossible de prendre des tags de surge.");
    return 0;
  }
  const active = activePlayers(match.userTeam);
  const aim = active.reduce((sum, player) => sum + player.skills.aim, 0) / Math.max(1, active.length);
  const weaponDamage = match.userTeam.inventory.weapons.reduce((sum, weapon) => sum + weapon.damage, 0) / Math.max(1, match.userTeam.inventory.weapons.length);
  let remaining = Math.round(Math.max(35, active.length * (25 + aim * 0.25 + weaponDamage * 0.18) + random.nextInt(0, 25)));
  let inflicted = 0;
  for (const target of activePlayers(enemy)) {
    if (remaining <= 0) break;
    const shieldDamage = Math.min(target.shield, remaining);
    target.shield -= shieldDamage;
    remaining -= shieldDamage;
    let actual = shieldDamage;
    const healthDamage = Math.min(target.health, remaining);
    target.health -= healthDamage;
    remaining -= healthDamage;
    actual += healthDamage;
    inflicted += actual;
    if (target.health <= 0) {
      eliminatePlayer(target);
      event(match, "ELIMINATION", "Élimination", `Ton équipe élimine ${target.name} (${enemy.name}) après un tag de surge.`);
      match.userTeam.eliminations += 1;
    }
  }
  match.userTeam.damageDealt += inflicted;
  if (!alivePlayers(enemy).length) {
    enemy.alive = false;
    event(match, "INFO", "Équipe éliminée", `${enemy.name} est entièrement éliminée après les tags.`);
  }
  event(match, "SURGE", "Tags de surge", `Ton équipe inflige réellement ${inflicted} dégâts à ${enemy.name}. Progression : ${match.userTeam.damageDealt}/${match.surgeThreshold}.`);
  return inflicted;
}
function reviveTeam(team: BattleTeam, playerId?: string): string {
  if (!activePlayers(team).length) return "Il faut au moins un équipier actif pour réanimer un mate.";
  const target = team.players.find(player => player.id === playerId && player.alive && player.knocked)
    ?? team.players.find(player => player.alive && player.knocked);
  if (!target) return "Aucun équipier à terre à réanimer.";
  target.knocked = false;
  target.health = 30;
  target.shield = 0;
  return `${target.name} est réanimé avec 30 PV.`;
}
function healTeam(team: BattleTeam, itemDefinitionId?: string, playerId?: string): string {
  const target = team.players.find(p => p.id === playerId && p.alive) ?? team.players.find(p => p.alive && (p.health < 100 || p.shield < 100));
  if (!target) return "Aucun mate n'a besoin de soins.";
  const itemIndex = team.inventory.items.findIndex(i => i.kind === "HEAL" && (!itemDefinitionId || i.definitionId === itemDefinitionId) && i.quantity > 0);
  if (itemIndex < 0) return "Aucun consommable de soin disponible.";
  const item = team.inventory.items[itemIndex];
  const before = target.health + target.shield;
  target.health = Math.min(100, target.health + (item.heal ?? 0));
  target.shield = Math.min(100, target.shield + (item.shield ?? 0));
  item.quantity -= 1;
  if (item.quantity <= 0) team.inventory.items.splice(itemIndex, 1);
  return `${target.name} récupère ${Math.round(target.health + target.shield - before)} points de vie/bouclier grâce à ${item.name}.`;
}
function nearestLocation(match: BattleMatch, random: SeededRandom): MapLocation {
  const candidates = match.map.locations.filter(l => l.id !== match.currentLocationId);
  return candidates.sort((a, b) => Math.hypot(a.x - match.userTeam.position.x, a.y - match.userTeam.position.y) - Math.hypot(b.x - match.userTeam.position.x, b.y - match.userTeam.position.y))[random.nextInt(0, Math.min(1, candidates.length - 1))];
}
function damageTeam(team: BattleTeam, damage: number, match: BattleMatch, reason: "storm" | "surge"): void {
  const targets = activePlayers(team);
  if (!targets.length) return;
  const target = targets[0];
  let remaining = damage;
  const shieldDamage = Math.min(target.shield, remaining);
  target.shield -= shieldDamage;
  remaining -= shieldDamage;
  target.health = Math.max(0, target.health - remaining);
  if (reason === "storm" && team.isUser) match.stormDamageTaken += damage;
  if (reason === "surge" && team.isUser) match.surgeDamageTaken += damage;
  if (target.health <= 0) {
    eliminatePlayer(target);
    event(match, "ELIMINATION", "Élimination par " + (reason === "storm" ? "la tempête" : "la storm surge"), `${target.name} (${team.name}) est éliminé par ${reason === "storm" ? "la tempête" : "la storm surge"}.`);
  }
  if (!alivePlayers(team).length) {
    team.alive = false;
    event(match, "INFO", "Équipe éliminée", `${team.name} est entièrement éliminée.`);
  }
}

function applyStormDamage(match: BattleMatch, seconds = 1): void {
  const phase = match.phases[Math.max(0, Math.min(match.phaseIndex - 1, match.phases.length - 1))];
  for (const team of match.teams.filter(candidate => candidate.alive)) {
    if (!isInsideStorm(team.position.x, team.position.y, match.storm)) damageTeam(team, phase.damagePerSecond * seconds, match, "storm");
  }
}

function updateStormCircle(match: BattleMatch): void {
  const phase = match.phases[Math.max(0, Math.min(match.phaseIndex - 1, match.phases.length - 1))];
  if (match.secondsUntilShrink > 0) { match.secondsUntilShrink -= 1; return; }
  if (match.secondsIntoShrink >= phase.shrinkSeconds) return;
  match.secondsIntoShrink += 1;
  const remaining = Math.max(1, phase.shrinkSeconds - match.secondsIntoShrink + 1);
  match.storm.x += (match.stormTarget.x - match.storm.x) / remaining;
  match.storm.y += (match.stormTarget.y - match.storm.y) / remaining;
  match.storm.radius += (match.stormTarget.radius - match.storm.radius) / remaining;
  if (match.secondsIntoShrink >= phase.shrinkSeconds) match.storm = { ...match.stormTarget };
}

function updateSurge(match: BattleMatch): void {
  const activeCount = activePlayers(match.userTeam).length;
  match.surgeThreshold = Math.max(100, activeCount * 100);
  match.stormSurgeActive = match.phaseIndex >= 3 && match.userTeam.damageDealt < match.surgeThreshold;
  if (match.phaseIndex < 3 || !match.stormSurgeActive || match.gameTimeSeconds - match.lastSurgePulse < 5) return;
  match.lastSurgePulse = match.gameTimeSeconds;
  for (const team of match.teams.filter(candidate => candidate.alive && candidate.damageDealt < Math.max(100, activePlayers(candidate).length * 100))) {
    if (!activePlayers(team).length) continue;
    damageTeam(team, 25, match, "surge");
    if (team.isUser) event(match, "SURGE", "Storm surge active", `Seuil non atteint : ${team.damageDealt}/${match.surgeThreshold}. Ton équipe subit 25 dégâts de surge.`);
  }
}

export function advanceMatchTime(match: BattleMatch, gameSeconds = 5): BattleMatch {
  if (match.stage !== "LOOT" && match.stage !== "ZONE") return match;
  const safeSeconds = Math.max(1, Math.min(300, Math.floor(gameSeconds)));
  for (let second = 0; second < safeSeconds; second++) {
    match.gameTimeSeconds += 1;
    updateStormCircle(match);
    applyStormDamage(match, 1);
    updateSurge(match);
    if (match.gameTimeSeconds % 15 === 0) {
      const random = new SeededRandom(match.seed + match.gameTimeSeconds * 31 + match.events.length * 7);
      simulateWorldTick(match, random, 0.025);
    }
    updateCounts(match);
    if (match.finishedAt !== null) break;
  }
  return match;
}
function moveTeam(match: BattleMatch, location: MapLocation): void {
  match.currentLocationId = location.id;
  match.userTeam.position = { x: location.x, y: location.y };
  event(match, "ROTATE", "Rotation effectuée", `Ton équipe se déplace vers ${location.name}.`);
}

/** Simulates one world tick: enemy squads rotate and can meet/fight without player input. */
function simulateWorldTick(match: BattleMatch, random: SeededRandom, encounterChance = 0.34): void {
  const enemies = match.teams.filter(team => !team.isUser && team.alive);
  const mapWidth = match.map.width;
  const mapHeight = match.map.height;

  // Enemy teams progressively rotate toward the active storm instead of staying on their drop POI.
  for (const team of enemies) {
    const dx = match.storm.x - team.position.x;
    const dy = match.storm.y - team.position.y;
    const distance = Math.hypot(dx, dy) || 1;
    const step = random.nextInt(180, 520);
    const driftX = random.nextInt(-170, 170);
    const driftY = random.nextInt(-170, 170);
    team.position = {
      x: Math.max(120, Math.min(mapWidth - 120, team.position.x + dx / distance * step + driftX)),
      y: Math.max(120, Math.min(mapHeight - 120, team.position.y + dy / distance * step + driftY)),
    };
  }

  // Resolve at most one encounter per team in this tick. Each death gets its own feed entry.
  const engaged = new Set<string>();
  for (const team of enemies) {
    if (engaged.has(team.id) || !team.alive) continue;
    const opponents = enemies
      .filter(other => other.id !== team.id && other.alive && !engaged.has(other.id))
      .map(other => ({ other, distance: Math.hypot(other.position.x - team.position.x, other.position.y - team.position.y) }))
      .filter(entry => entry.distance < 1050)
      .sort((a, b) => a.distance - b.distance);
    const encounter = opponents[0];
    if (!encounter || random.next() > encounterChance) continue;

    const rival = encounter.other;
    engaged.add(team.id);
    engaged.add(rival.id);
    const winner = random.next() * 100 < clamp(50 + (teamPower(team) - teamPower(rival)) * 0.65, 12, 88) ? team : rival;
    const loser = winner.id === team.id ? rival : team;
    const victim = alivePlayers(loser)[random.nextInt(0, alivePlayers(loser).length - 1)];
    const killer = alivePlayers(winner)[random.nextInt(0, alivePlayers(winner).length - 1)];
    if (!victim || !killer) continue;

    eliminatePlayer(victim);
    winner.eliminations += 1;
    winner.damageDealt += random.nextInt(90, 180);
    event(match, "ELIMINATION", "Élimination", `${killer.name} (${winner.name}) élimine ${victim.name} (${loser.name}).`);

    // A losing squad can suffer a second elimination in a longer exchange.
    if (alivePlayers(loser).length > 0 && random.next() < 0.22) {
      const secondVictim = alivePlayers(loser)[0];
      const secondKiller = alivePlayers(winner)[0] ?? killer;
      eliminatePlayer(secondVictim);
      winner.eliminations += 1;
      event(match, "ELIMINATION", "Élimination", `${secondKiller.name} (${winner.name}) élimine ${secondVictim.name} (${loser.name}).`);
    }

    if (alivePlayers(loser).length === 0) {
      loser.alive = false;
      event(match, "INFO", "Équipe éliminée", `${loser.name} quitte la partie.`);
    }
  }
}
function processAction(match: BattleMatch, action: BattleAction, random: SeededRandom): void {
  const location = match.map.locations.find(l => l.id === match.currentLocationId)!;
  switch (action.type) {
    case "FIGHT": fight(match, random, action.style); break;
    case "FIGHT_THEN_ROTATE": {
      fight(match, random);
      if (match.userTeam.alive) {
        const destination = match.map.locations.find(l => l.id === action.locationId) ?? nearestLocation(match, random);
        moveTeam(match, destination);
      }
      break;
    }
    case "FIGHT_HEIGHT": {
      const report = fight(match, random, "HEIGHT");
      if (match.phaseIndex >= 4 && !report.won) { match.userTeam.alive = false; for (const player of alivePlayers(match.userTeam)) eliminatePlayer(player); }
      break;
    }
    case "FIGHT_MID": {
      const report = fight(match, random, "MID");
      if (match.phaseIndex >= 4 && !report.won) { match.userTeam.alive = false; for (const player of alivePlayers(match.userTeam)) eliminatePlayer(player); }
      break;
    }
    case "FIGHT_LOW": {
      const report = fight(match, random, "LOW");
      if (match.phaseIndex >= 4 && !report.won) { match.userTeam.alive = false; for (const player of alivePlayers(match.userTeam)) eliminatePlayer(player); }
      break;
    }
    case "FIGHT_OUTSIDE": {
      const report = fight(match, random, "OUTSIDE");
      if (match.phaseIndex >= 4 && !report.won) { match.userTeam.alive = false; for (const player of alivePlayers(match.userTeam)) eliminatePlayer(player); }
      break;
    }
    case "LOOT": {
      const drops = makeDrop(match, location, random);
      const result = collectLoot(match.userTeam, drops);
      match.lootOnGround.push(...result.remaining);
      event(match, "LOOT", "Loot récupéré", `${result.collected.length} objet(s) récupéré(s), ${match.userTeam.inventory.weapons.length}/5 armes.`);
      break;
    }
    case "REFRESH": {
      const gained = refresh(match.userTeam, location, random, action.material);
      event(match, "REFRESH", "Refresh matériaux", `+ ${gained} matériaux récoltés. Bois ${match.userTeam.resources.wood}, pierre ${match.userTeam.resources.stone}, métal ${match.userTeam.resources.metal}.`);
      break;
    }
    case "FARM_FULL": {
      const gained = farmToTarget(match.userTeam, 500);
      event(match, "FARM", "Farm complet", `Récolte complète : +${gained} matériaux. Bois ${match.userTeam.resources.wood}/500, pierre ${match.userTeam.resources.stone}/500, métal ${match.userTeam.resources.metal}/500.`);
      break;
    }
    case "FARM_HALF_ROTATE": {
      const gained = farmToTarget(match.userTeam, 250);
      const destination = match.map.locations.filter(candidate => candidate.id !== match.currentLocationId)
        .sort((a, b) => Math.hypot(a.x - match.stormTarget.x, a.y - match.stormTarget.y) - Math.hypot(b.x - match.stormTarget.x, b.y - match.stormTarget.y))[0] ?? nearestLocation(match, random);
      event(match, "FARM", "Farm à moitié", `Récolte intermédiaire : +${gained} matériaux, objectif 250 par type. Rotation anticipée vers ${destination.name}.`);
      moveTeam(match, destination);
      break;
    }
    case "FARM_SURGE": farmSurgeTags(match, random); break;
    case "ROTATE": {
      const destination = match.map.locations.find(l => l.id === action.locationId) ?? nearestLocation(match, random);
      moveTeam(match, destination);
      if (random.next() < destination.danger / 220) {
        const report = fight(match, random);
        event(match, "INFO", "Rencontre sur la rotation", report.summary);
      }
      break;
    }
    case "REVIVE": {
      const summary = reviveTeam(match.userTeam, action.playerId);
      event(match, "INFO", "Réanimation", summary);
      break;
    }
    case "HEAL": {
      const summary = healTeam(match.userTeam, action.itemDefinitionId, action.playerId);
      event(match, "HEAL", "Soin utilisé", summary);
      break;
    }
    case "HOLD_POSITION": {
      match.userTeam.builds += 1;
      const material: Material = match.userTeam.resources.wood >= 10 ? "WOOD" : match.userTeam.resources.stone >= 10 ? "STONE" : "METAL";
      const key = material.toLowerCase() as keyof Resources;
      if (match.userTeam.resources[key] >= 10) match.userTeam.resources[key] -= 10;
      const bonus = alivePlayers(match.userTeam).reduce((sum, p) => sum + p.skills.positioning, 0) / Math.max(1, alivePlayers(match.userTeam).length);
      event(match, "INFO", "Position sécurisée", `Construction défensive posée. Bonus de position ${Math.round(bonus)}.`);
      break;
    }
  }
}
export function createBattleRoyale(seed: number, mode: BattleMatch["mode"], dropLocationId: string, teamNames = ["Ton équipe"], playerRatings?: number[]): BattleMatch {
  if (!Number.isInteger(seed)) throw new Error("La seed doit être un entier.");
  if (playerRatings && (playerRatings.length !== TEAM_SIZE[mode] || playerRatings.some(rating => !Number.isFinite(rating) || rating < 0 || rating > 100))) {
    throw new Error(`Il faut fournir ${TEAM_SIZE[mode]} notes de joueurs comprises entre 0 et 100.`);
  }
  const random = new SeededRandom(seed);
  const location = BATTLE_ROYALE_MAP.locations.find(l => l.id === dropLocationId);
  if (!location) throw new Error("Point d'atterrissage inconnu.");
  const userTeam = createTeam("user-team", teamNames[0] ?? "Ton équipe", true, mode, location.id, location.x, location.y, random, 72, playerRatings);
  const teams: BattleTeam[] = [userTeam];
  const totalTeams = Math.floor(100 / TEAM_SIZE[mode]);
  for (let i = 0; i < totalTeams - 1; i++) {
    const poi = BATTLE_ROYALE_MAP.locations[random.nextInt(0, BATTLE_ROYALE_MAP.locations.length - 1)];
    const bot = createTeam(`bot-${i + 1}`, `Team ${String(i + 1).padStart(2, "0")}`, false, mode, poi.id, poi.x + random.nextInt(-120, 120), poi.y + random.nextInt(-120, 120), random);
    const botWeaponCount = random.nextInt(1, 3);
    for (let weaponIndex = 0; weaponIndex < botWeaponCount; weaponIndex++) {
      const definition = WEAPONS[random.nextInt(0, WEAPONS.length - 1)];
      const rarity = rarityRoll(random);
      bot.inventory.weapons.push({ id: `${bot.id}-weapon-${weaponIndex}`, definitionId: definition.id, name: definition.name, category: definition.category, rarity, damage: Math.round(definition.baseDamage * RARITY_MULTIPLIER[rarity]), magazine: 30, ammo: 30 });
    }
    bot.resources = { wood: random.nextInt(0, 500), stone: random.nextInt(0, 500), metal: random.nextInt(0, 500) };
    teams.push(bot);
  }
  const match: BattleMatch = {
    id: `br-${seed}`, seed, mode, stage: "DROP",
    map: BATTLE_ROYALE_MAP, userTeam, teams, selectedDropId: location.id, currentLocationId: location.id,
    storm: { x: 5000, y: 5000, radius: 5000 }, stormTarget: { x: 5000, y: 5000, radius: 5000 }, phases: ZONE_PHASES, phaseIndex: 0,
    secondsUntilShrink: ZONE_PHASES[0].waitSeconds, secondsIntoShrink: 0,
    gameTimeSeconds: 0, stormDamageTaken: 0, surgeDamageTaken: 0, surgeThreshold: 150, stormSurgeActive: false, lastSurgePulse: 0,
    lootOnGround: [], events: [], teamsRemaining: teams.length, playersRemaining: teams.reduce((n,t) => n + t.players.length, 0),
    startedAt: Date.now(), finishedAt: null, finalPlacement: null, result: null,
  };
  event(match, "DROP", "Atterrissage confirmé", `Ton équipe atterrit à ${location.name}. ${teams.filter(t => !t.isUser && t.dropLocationId === location.id).length} équipe(s) ennemie(s) sont également présentes.`);
  match.surgeThreshold = Math.max(100, activePlayers(userTeam).length * 100);
  return match;
}
export function resolveDrop(match: BattleMatch, action: Extract<BattleAction, { type: "FIGHT" | "LOOT" | "ROTATE" }>): BattleMatch {
  if (match.stage !== "DROP") throw new Error("Le choix de spawn a déjà été effectué.");
  const random = new SeededRandom(match.seed + 101);
  match.stage = "LOOT";
  if (action.type === "FIGHT") {
    const spawnDrops = makeDrop(match, match.map.locations.find(l => l.id === match.currentLocationId)!, random);
    const spawnLoot = collectLoot(match.userTeam, spawnDrops);
    match.lootOnGround.push(...spawnLoot.remaining);
    event(match, "LOOT", "Loot de spawn", `${spawnLoot.collected.length} objet(s) récupéré(s) avant le combat.`);
    const contested = match.teams.some(team => !team.isUser && team.alive && team.dropLocationId === match.selectedDropId);
    if (contested) fight(match, random);
    else event(match, "INFO", "Spawn non contesté", "Aucune équipe adverse n’a atterri sur ce spot : ton équipe sécurise le loot.");
  } else if (action.type === "ROTATE") {
    const target = match.map.locations.find(l => l.id === action.locationId) ?? nearestLocation(match, random); moveTeam(match, target);
    const drops = makeDrop(match, target, random); const collected = collectLoot(match.userTeam, drops);
    match.lootOnGround.push(...collected.remaining);
    event(match, "LOOT", "Loot après rotation", `${collected.collected.length} objet(s) récupéré(s) à ${target.name}.`);
  } else {
    const drops = makeDrop(match, match.map.locations.find(l => l.id === match.currentLocationId)!, random);
    const result = collectLoot(match.userTeam, drops); match.lootOnGround.push(...result.remaining);
    event(match, "LOOT", "Loot du spawn", `${result.collected.length} objet(s) récupéré(s). Les adversaires proches peuvent contester le spot.`);
    const nearby = findEnemy(match);
    if (nearby && random.next() < 0.28) fight(match, random);
  }
  match.stormTarget = nextStormCircle(match.storm, match.phases[0].radius, random);
  match.phaseIndex = 1;
  match.secondsUntilShrink = match.phases[0].waitSeconds;
  match.secondsIntoShrink = 0;
  simulateWorldTick(match, random);
  updateCounts(match);
  return match;
}
export function takeZoneAction(match: BattleMatch, action: BattleAction): BattleMatch {
  if (match.stage !== "LOOT" && match.stage !== "ZONE") throw new Error("La partie n'accepte plus d'action.");
  if (!match.userTeam.alive) { updateCounts(match); return match; }
  const random = new SeededRandom(match.seed + 1000 + match.phaseIndex * 97 + match.events.length * 13);
  processAction(match, action, random);
  if (!isFinished(match)) simulateWorldTick(match, random);
  if (isFinished(match)) return match;
  match.stage = "ZONE";
  if (match.phaseIndex >= 4) {
    const lastEnemy = match.teams.find(team => !team.isUser && team.alive);
    if (lastEnemy && match.userTeam.alive && !["FIGHT_HEIGHT", "FIGHT_MID", "FIGHT_LOW", "FIGHT_OUTSIDE", "FIGHT"].includes(action.type)) {
      const report = fight(match, random);
      if (!report.won) {
        match.userTeam.alive = false;
        for (const player of alivePlayers(match.userTeam)) eliminatePlayer(player);
      } else {
        for (const player of alivePlayers(lastEnemy)) eliminatePlayer(player);
        lastEnemy.alive = false;
      }
    }
    updateCounts(match);
    if (!isFinished(match)) finishMatch(match, match.userTeam.alive ? "WIN" : "ELIMINATED");
    return match;
  }
  const next = match.phases[match.phaseIndex];
  match.stormTarget = nextStormCircle(match.stormTarget, next.radius, random);
  match.secondsUntilShrink = next.waitSeconds;
  match.secondsIntoShrink = 0;
  match.phaseIndex += 1;
  updateSurge(match);
  updateCounts(match);
  return match;
}
export function getActionOptions(match: BattleMatch): Array<{ type: ActionType; label: string; description: string; risk: "LOW" | "MEDIUM" | "HIGH" }> {
  const options: Array<{ type: ActionType; label: string; description: string; risk: "LOW" | "MEDIUM" | "HIGH" }> = match.stage === "DROP" ? [
    { type: "FIGHT" as const, label: "Atterrir ici malgré la contestation", description: "Prendre le fight au spawn si une équipe adverse est présente.", risk: "HIGH" as const },
    { type: "LOOT" as const, label: "Atterrir ici et loot librement", description: "Sécuriser le spot et récupérer le premier équipement.", risk: "MEDIUM" as const },
    { type: "ROTATE" as const, label: "Changer de point de spawn", description: "Choisir un autre lieu pour éviter une équipe adverse.", risk: "LOW" as const },
  ] : match.phaseIndex === 1 ? [
    { type: "FIGHT" as const, label: "Prendre un fight sur la rotation", description: "Comparer les notes, la vie, les boucliers et l'équipement des deux équipes.", risk: "HIGH" as const },
    { type: "FARM_FULL" as const, label: "Farm complet · 500/500", description: "Récolter le maximum : 500 bois, 500 pierre et 500 métal.", risk: "LOW" as const },
    { type: "FARM_HALF_ROTATE" as const, label: "Farm à moitié puis rotate", description: "Atteindre 250 de chaque matériau et partir plus tôt vers la zone.", risk: "LOW" as const },
    { type: "FARM_SURGE" as const, label: "Prendre des tags pour la surge", description: "Infliger des dégâts à distance sans chercher l'élimination.", risk: "MEDIUM" as const },
  ] : match.phaseIndex === 2 ? [
    { type: "ROTATE" as const, label: "Lancer la rotation maintenant", description: "Rejoindre directement la prochaine zone avant la fermeture de la tempête.", risk: "LOW" as const },
    { type: "FIGHT_THEN_ROTATE" as const, label: "Prendre un fight puis rotate", description: "Tenter un engagement avant de rejoindre la prochaine zone.", risk: "HIGH" as const },
    { type: "FARM_SURGE" as const, label: "Farmer la surge", description: "Chercher des dégâts sur une équipe adverse pour atteindre le seuil de storm surge.", risk: "MEDIUM" as const },
  ] : match.phaseIndex === 3 ? [
    { type: "FIGHT" as const, label: "Prendre un fight sur la rotation", description: "Évaluer la force et le stuff adverse avant l'engagement.", risk: "HIGH" as const },
    { type: "ROTATE" as const, label: "Avancer vers la prochaine zone", description: "Prendre de l'avance sur la tempête et rejoindre le prochain cercle.", risk: "MEDIUM" as const },
    { type: "REFRESH" as const, label: "Refresh matériaux", description: "Compléter les ressources sans dépasser 500 par matériau.", risk: "LOW" as const },
    { type: "FARM_SURGE" as const, label: "Farmer la surge", description: "Prendre des tags pour éviter les dégâts de storm surge si le seuil n'est pas atteint.", risk: "MEDIUM" as const },
  ] : [
    { type: "FIGHT_HEIGHT" as const, label: "Prendre la hauteur", description: "Meilleure synergie avec fusils d'assaut et snipers.", risk: "HIGH" as const },
    { type: "FIGHT_MID" as const, label: "Jouer au milieu", description: "Meilleure synergie avec les pompes et les armes polyvalentes.", risk: "HIGH" as const },
    { type: "FIGHT_LOW" as const, label: "Jouer en bas", description: "Meilleure synergie avec les SMG et les pompes.", risk: "HIGH" as const },
    { type: "FIGHT_OUTSIDE" as const, label: "Jouer hors zone", description: "Privilégier les armes à distance et les objets utilitaires.", risk: "HIGH" as const },
  ];
  const canRevive = match.userTeam.players.some(player => player.alive && player.knocked) && activePlayers(match.userTeam).length > 0;
  if (canRevive) options.push({ type: "REVIVE", label: "Réanimer un équipier", description: "Un équipier à terre revient avec 30 PV. Il faut garder au moins un mate actif.", risk: "MEDIUM" });
  return options;
}
export function getRarityRollTable(): ReadonlyArray<{ rarity: Rarity; weight: number }> {
  return rarityWeights.map(([rarity, weight]) => ({ rarity, weight }));
}
export function getInventorySummary(team: BattleTeam): { weapons: WeaponInstance[]; items: ItemStack[]; resources: Resources } {
  return { weapons: team.inventory.weapons, items: team.inventory.items, resources: team.resources };
}
