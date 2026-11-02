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
  return { id, name, isUser, players, inventory: createInventory(), resources: { wood: 0, stone: 0, metal: 0 }, eliminations: 0, placement: null, dropLocationId: locationId, alive: true, position: { x, y }, builds: 0 };
}
function event(match: BattleMatch, type: BattleEvent["type"], title: string, description: string): BattleEvent {
  const item = { id: `event-${match.events.length + 1}`, phase: match.phaseIndex, type, title, description, createdAt: Date.now() };
  match.events.unshift(item); return item;
}
function alivePlayers(team: BattleTeam): BattlePlayer[] { return team.players.filter(p => p.alive); }
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
function teamPower(team: BattleTeam): number {
  const players = alivePlayers(team); if (!players.length) return 0;
  const skill = players.reduce((sum, p) => sum + (p.skills.overall * 0.25 + p.skills.aim * 0.18 + p.skills.building * 0.18 + p.skills.gameSense * 0.16 + p.skills.positioning * 0.12 + p.skills.teamwork * 0.11), 0) / players.length;
  const weapon = team.inventory.weapons.length ? team.inventory.weapons.reduce((sum, w) => sum + w.damage, 0) / team.inventory.weapons.length / 1.2 : 15;
  const gear = clamp(weapon, 10, 100);
  const health = players.reduce((sum, p) => sum + p.health + p.shield * 0.6, 0) / players.length / 2;
  const buildBonus = Math.min(12, team.builds * 1.5) + Math.min(10, (team.resources.wood + team.resources.stone + team.resources.metal) / 100);
  return skill * 0.65 + gear * 0.2 + health * 0.1 + buildBonus * 0.05;
}
function findEnemy(match: BattleMatch, preferredLocation?: string): BattleTeam | undefined {
  const enemies = match.teams.filter(t => !t.isUser && t.alive);
  if (!enemies.length) return undefined;
  const nearby = enemies.filter(t => t.dropLocationId === (preferredLocation ?? match.currentLocationId));
  const pool = nearby.length ? nearby : enemies;
  return pool.sort((a, b) => Math.hypot(a.position.x - match.userTeam.position.x, a.position.y - match.userTeam.position.y) - Math.hypot(b.position.x - match.userTeam.position.x, b.position.y - match.userTeam.position.y))[0];
}
function eliminatePlayer(player: BattlePlayer): void { player.alive = false; player.health = 0; player.shield = 0; player.knocked = false; }
function fight(match: BattleMatch, random: SeededRandom): FightReport {
  const enemy = findEnemy(match);
  if (!enemy) return { winProbability: 100, won: true, enemyTeamName: "Personne", enemyEliminations: 0, allyLosses: 0, summary: "Aucun adversaire à portée : ton équipe sécurise la zone." };
  const userPower = teamPower(match.userTeam);
  const enemyPower = teamPower(enemy);
  const positioning = match.userTeam.position.y < 5000 ? 4 : 0;
  const buildAdvantage = Math.min(8, match.userTeam.resources.wood / 80 + match.userTeam.resources.stone / 100);
  const winProbability = clamp(50 + (userPower - enemyPower) * 0.72 + positioning + buildAdvantage, 5, 95);
  const won = random.next() * 100 < winProbability;
  const enemyAlive = alivePlayers(enemy);
  const allies = alivePlayers(match.userTeam);
  const enemyEliminations = won ? enemyAlive.length : random.nextInt(0, Math.max(1, enemyAlive.length - 1));
  const allyLosses = won ? (random.next() < 0.12 ? 1 : 0) : Math.min(allies.length, random.nextInt(1, Math.max(1, allies.length)));
  for (let i = 0; i < enemyEliminations; i++) eliminatePlayer(enemyAlive[i]);
  if (enemyEliminations > 0) match.userTeam.eliminations += enemyEliminations;
  for (let i = 0; i < allyLosses; i++) eliminatePlayer(allies[allies.length - 1 - i]);
  if (!alivePlayers(enemy).length) { enemy.alive = false; enemy.placement = match.teamsRemaining; }
  if (!alivePlayers(match.userTeam).length) match.userTeam.alive = false;
  const summary = won ? `Victoire contre ${enemy.name} ! ${enemyEliminations} adversaire(s) éliminé(s).` : `Combat perdu contre ${enemy.name}. ${allyLosses} mate(s) éliminé(s), replie-toi.`;
  event(match, "FIGHT", won ? "Combat remporté" : "Combat perdu", summary);
  return { winProbability: Math.round(winProbability), won, enemyTeamName: enemy.name, enemyEliminations, allyLosses, summary };
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
function applyStormDamage(match: BattleMatch): void {
  const phase = match.phases[Math.min(match.phaseIndex, match.phases.length - 1)];
  if (isInsideStorm(match.userTeam.position.x, match.userTeam.position.y, match.storm)) return;
  const seconds = phase.shrinkSeconds + phase.waitSeconds;
  const damage = phase.damagePerSecond * Math.min(seconds, 30);
  for (const player of alivePlayers(match.userTeam)) {
    let remaining = damage;
    const shieldDamage = Math.min(player.shield, remaining); player.shield -= shieldDamage; remaining -= shieldDamage;
    player.health = Math.max(0, player.health - remaining);
    if (player.health <= 0) eliminatePlayer(player);
  }
  if (!alivePlayers(match.userTeam).length) match.userTeam.alive = false;
  event(match, "STORM", "Dégâts de tempête", `Ton équipe subit ${damage} dégâts car elle est hors zone.`);
}
function moveTeam(match: BattleMatch, location: MapLocation): void {
  match.currentLocationId = location.id;
  match.userTeam.position = { x: location.x, y: location.y };
  event(match, "ROTATE", "Rotation effectuée", `Ton équipe se déplace vers ${location.name}.`);
}
function processAction(match: BattleMatch, action: BattleAction, random: SeededRandom): void {
  const location = match.map.locations.find(l => l.id === match.currentLocationId)!;
  switch (action.type) {
    case "FIGHT": fight(match, random); break;
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
    case "ROTATE": {
      const destination = match.map.locations.find(l => l.id === action.locationId) ?? nearestLocation(match, random);
      moveTeam(match, destination);
      if (random.next() < destination.danger / 220) {
        const report = fight(match, random);
        event(match, "INFO", "Rencontre sur la rotation", report.summary);
      }
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
    teams.push(createTeam(`bot-${i + 1}`, `Team ${String(i + 1).padStart(2, "0")}`, false, mode, poi.id, poi.x + random.nextInt(-120, 120), poi.y + random.nextInt(-120, 120), random));
  }
  const match: BattleMatch = {
    id: `br-${seed}`, seed, mode, stage: "DROP",
    map: BATTLE_ROYALE_MAP, userTeam, teams, selectedDropId: location.id, currentLocationId: location.id,
    storm: { x: 5000, y: 5000, radius: 5000 }, phases: ZONE_PHASES, phaseIndex: 0,
    secondsUntilShrink: ZONE_PHASES[0].waitSeconds, secondsIntoShrink: 0,
    lootOnGround: [], events: [], teamsRemaining: teams.length, playersRemaining: teams.reduce((n,t) => n + t.players.length, 0),
    startedAt: Date.now(), finishedAt: null, finalPlacement: null, result: null,
  };
  event(match, "DROP", "Atterrissage confirmé", `Ton équipe atterrit à ${location.name}. ${teams.filter(t => !t.isUser && t.dropLocationId === location.id).length} équipe(s) ennemie(s) sont également présentes.`);
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
    fight(match, random);
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
  updateCounts(match);
  return match;
}
export function takeZoneAction(match: BattleMatch, action: BattleAction): BattleMatch {
  if (match.stage !== "LOOT" && match.stage !== "ZONE") throw new Error("La partie n'accepte plus d'action.");
  if (!match.userTeam.alive) { updateCounts(match); return match; }
  const random = new SeededRandom(match.seed + 1000 + match.phaseIndex * 97 + match.events.length * 13);
  processAction(match, action, random);
  if (isFinished(match)) return match;
  match.stage = "ZONE";
  if (match.phaseIndex >= match.phases.length) {
    const lastEnemy = match.teams.find(t => !t.isUser && t.alive);
    if (lastEnemy) {
      const report = fight(match, random);
      if (!report.won) { match.userTeam.alive = false; for (const p of alivePlayers(match.userTeam)) eliminatePlayer(p); }
      else { for (const p of alivePlayers(lastEnemy)) eliminatePlayer(p); lastEnemy.alive = false; }
    }
    updateCounts(match);
    if (!isFinished(match)) finishMatch(match, match.userTeam.alive ? "WIN" : "ELIMINATED");
    return match;
  }
  const next = match.phases[match.phaseIndex];
  match.storm = nextStormCircle(match.storm, next.radius, random);
  match.secondsUntilShrink = next.waitSeconds;
  match.secondsIntoShrink = 0;
  applyStormDamage(match);
  match.phaseIndex += 1;
  updateCounts(match);
  if (match.phaseIndex >= match.phases.length && !isFinished(match)) {
    const lastEnemy = match.teams.find(t => !t.isUser && t.alive);
    if (lastEnemy && match.userTeam.alive) {
      const report = fight(match, random);
      if (!report.won) { match.userTeam.alive = false; for (const p of alivePlayers(match.userTeam)) eliminatePlayer(p); }
      else { for (const p of alivePlayers(lastEnemy)) eliminatePlayer(p); lastEnemy.alive = false; }
    }
    updateCounts(match);
    if (!isFinished(match)) finishMatch(match, match.userTeam.alive ? "WIN" : "ELIMINATED");
  }
  return match;
}
export function getActionOptions(match: BattleMatch): Array<{ type: ActionType; label: string; description: string; risk: "LOW" | "MEDIUM" | "HIGH" }> {
  if (match.stage === "DROP") return [
    { type: "FIGHT", label: "Prendre le fight au spawn", description: "Affronter les équipes qui atterrissent au même endroit.", risk: "HIGH" },
    { type: "LOOT", label: "Loot librement", description: "Récupérer des armes et des soins en évitant l'engagement direct.", risk: "MEDIUM" },
    { type: "ROTATE", label: "Changer de zone", description: "Quitter le point chaud et rejoindre un spot voisin.", risk: "LOW" },
  ];
  return [
    { type: "FIGHT", label: "Prendre un fight", description: "Chercher une équipe adverse et tenter de l'éliminer.", risk: "HIGH" },
    { type: "REFRESH", label: "Refresh matériaux", description: "Récolter du bois, de la pierre et du métal.", risk: "LOW" },
    { type: "ROTATE", label: "Se déplacer", description: "Rejoindre un autre point de la carte et préparer la zone.", risk: "MEDIUM" },
    { type: "HEAL", label: "Se soigner", description: "Utiliser les consommables pour récupérer vie et bouclier.", risk: "LOW" },
    { type: "HOLD_POSITION", label: "Jouer la position", description: "Dépenser des matériaux pour sécuriser une construction.", risk: "MEDIUM" },
    { type: "LOOT", label: "Continuer à looter", description: "Chercher des armes, des soins et des munitions.", risk: "MEDIUM" },
  ];
}
export function getRarityRollTable(): ReadonlyArray<{ rarity: Rarity; weight: number }> {
  return rarityWeights.map(([rarity, weight]) => ({ rarity, weight }));
}
export function getInventorySummary(team: BattleTeam): { weapons: WeaponInstance[]; items: ItemStack[]; resources: Resources } {
  return { weapons: team.inventory.weapons, items: team.inventory.items, resources: team.resources };
}
