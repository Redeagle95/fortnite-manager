import { SeededRandom } from "../engine/random";
import { CONSUMABLES, RARITIES, RARITY_MULTIPLIER, WEAPONS } from "./catalog";
import { BATTLE_ROYALE_MAP, isInsideStorm, nextStormCircle, ZONE_PHASES } from "./map";
import type { ActionType, BattleAction, BattleBusState, BattleEvent, BattleMatch, BattlePlayer, BattleTeam, BusFlightPlan, FightReport, Inventory, ItemStack, LootDrop, MapLocation, Material, PlayerSkill, Resources, Rarity, WeaponInstance } from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const TEAM_SIZE: Record<BattleMatch["mode"], number> = { SOLO: 1, DUO: 2, TRIO: 3, SQUAD: 4 };
const rarityWeights: Array<[Rarity, number]> = [["COMMON", 38], ["UNCOMMON", 27], ["RARE", 18], ["EPIC", 10], ["LEGENDARY", 5], ["MYTHIC", 2]];

function rarityRoll(random: SeededRandom, lootQuality = 50): Rarity {
  // POI quality shifts probability away from common loot and toward high-tier weapons.
  const quality = clamp(lootQuality) / 100;
  const adjusted: Array<[Rarity, number]> = [
    ["COMMON", 48 - 18 * quality], ["UNCOMMON", 30 - 6 * quality],
    ["RARE", 15 + 6 * quality], ["EPIC", 5 + 8 * quality],
    ["LEGENDARY", 2 + 6 * quality], ["MYTHIC", 4 * quality],
  ];
  const roll = random.next() * 100;
  let cursor = 0;
  for (const [rarity, weight] of adjusted) { cursor += weight; if (roll < cursor) return rarity; }
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
function createTeam(id: string, name: string, isUser: boolean, mode: BattleMatch["mode"], locationId: string, x: number, y: number, random: SeededRandom, skillBase?: number, playerRatings?: number[], strategy: BattleMatch["userTeam"]["strategy"] = "STRATEGIC"): BattleTeam {
  const players: BattlePlayer[] = Array.from({ length: TEAM_SIZE[mode] }, (_, i) => ({
    id: `${id}-p${i + 1}`, name: isUser ? (i === 0 ? "Toi" : `Mate ${i}`) : `${name} ${i + 1}`,
    skills: createSkills(random, playerRatings?.[i] ?? skillBase), role: (["IGL", "FRAGGER", "SUPPORT", "SCOUT"] as const)[i] ?? "SUPPORT", eliminations: 0, damageDealt: 0, rebooted: false, alive: true, health: 100, shield: 0, knocked: false,
  }));
  return { id, name, isUser, players, inventory: createInventory(), resources: { wood: 0, stone: 0, metal: 0 }, eliminations: 0, strategy, rebootTokens: Math.max(0, players.length - 1), placement: null, dropLocationId: locationId, alive: true, position: { x, y }, builds: 0, damageDealt: 0 };
}
function event(match: BattleMatch, type: BattleEvent["type"], title: string, description: string): BattleEvent {
  const item = { id: `event-${match.events.length + 1}`, phase: match.phaseIndex, type, title, description, createdAt: Date.now() };
  match.events.unshift(item); return item;
}
function alivePlayers(team: BattleTeam): BattlePlayer[] { return team.players.filter(p => p.alive); }
function activePlayers(team: BattleTeam): BattlePlayer[] { return team.players.filter(p => p.alive && !p.knocked); }
function activeRolePlayer(team: BattleTeam, role: BattlePlayer["role"]): BattlePlayer | undefined {
  return activePlayers(team).find(player => player.role === role);
}
function roleSkill(team: BattleTeam, role: BattlePlayer["role"], skill: keyof BattlePlayer["skills"]): number {
  return activeRolePlayer(team, role)?.skills[skill] ?? 0;
}
function rotationRiskMultiplier(team: BattleTeam): number {
  const igl = activeRolePlayer(team, "IGL");
  const scout = activeRolePlayer(team, "SCOUT");
  const leadership = igl ? 0.10 + igl.skills.decisionMaking * 0.002 : 0;
  const awareness = scout ? 0.08 + scout.skills.gameSense * 0.0015 : 0;
  const strategyFactor = team.strategy === "PRUDENT" ? 0.82 : team.strategy === "STRATEGIC" ? 0.92 : team.strategy === "AGGRESSIVE" ? 1.12 : 1;
  return clamp((1 - leadership - awareness) * strategyFactor, 0.4, 1.2);
}
function aliveTeams(match: BattleMatch): BattleTeam[] { return match.teams.filter(t => t.alive); }
function isFinished(match: BattleMatch): boolean { return match.stage === "FINISHED"; }
function updateCounts(match: BattleMatch): void {
  match.teamsRemaining = aliveTeams(match).length;
  match.playersRemaining = match.teams.reduce((sum, team) => sum + alivePlayers(team).length, 0);
  // A team eliminated before the final winner is decided remains in spectator simulation.
  // Keep its placement so the final result reflects the actual end of the Battle Royale.
  if (!match.userTeam.alive && match.userTeam.placement === null) {
    match.userTeam.placement = Math.max(2, match.teamsRemaining + 1);
  }
  if (match.teamsRemaining <= 1) {
    finishMatch(match, match.userTeam.alive ? "WIN" : "ELIMINATED");
  }
}
function finishMatch(match: BattleMatch, result: "WIN" | "ELIMINATED"): void {
  if (match.stage === "FINISHED") return;
  match.stage = "FINISHED"; match.result = result; match.finishedAt = Date.now();
  match.finalPlacement = result === "WIN" ? 1 : (match.userTeam.placement ?? Math.max(2, match.teamsRemaining + 1));
  match.userTeam.placement = match.finalPlacement;
  const placement = match.finalPlacement;
  match.placementPoints = placement === 1 ? 65 : placement === 2 ? 55 : placement === 3 ? 48 : placement <= 5 ? 40 : placement <= 10 ? 30 : placement <= 15 ? 20 : placement <= 25 ? 10 : 0;
  match.eliminationPoints = match.userTeam.eliminations * 2;
  match.totalPoints = match.placementPoints + match.eliminationPoints;
  event(match, "INFO", "Score compétitif", `Placement #${placement} : ${match.placementPoints} pts · ${match.userTeam.eliminations} élimination(s) : ${match.eliminationPoints} pts · Total : ${match.totalPoints} pts.`);
}
function pickLocation(random: SeededRandom): MapLocation {
  return BATTLE_ROYALE_MAP.locations[random.nextInt(0, BATTLE_ROYALE_MAP.locations.length - 1)];
}
function makeDrop(match: BattleMatch, location: MapLocation, random: SeededRandom): LootDrop[] {
  const drops: LootDrop[] = [];
  const scout = activeRolePlayer(match.userTeam, "SCOUT");
  const scoutedLocation = scout ? { ...location, lootQuality: clamp(location.lootQuality + 10 + scout.skills.gameSense * 0.1, 0, 100) } : location;
  const count = Math.max(2, location.lootAmount + random.nextInt(-2, 3));
  for (let i = 0; i < count; i++) {
    const roll = random.next();
    if (roll < 0.58) {
      const weapon = WEAPONS[random.nextInt(0, WEAPONS.length - 1)];
      const rarity = rarityRoll(random, scoutedLocation.lootQuality);
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
  return drops.map(drop => ({ ...drop, locationId: location.id }));
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
  const rolePower =
    (activeRolePlayer(team, "IGL") ? 1.5 + roleSkill(team, "IGL", "decisionMaking") * 0.035 : 0) +
    (activeRolePlayer(team, "FRAGGER") ? 2 + roleSkill(team, "FRAGGER", "aim") * 0.045 : 0) +
    (activeRolePlayer(team, "SUPPORT") ? 1 + roleSkill(team, "SUPPORT", "teamwork") * 0.025 : 0) +
    (activeRolePlayer(team, "SCOUT") ? 1.5 + roleSkill(team, "SCOUT", "gameSense") * 0.035 : 0);
  return skill * 0.65 + gear * 0.2 + health * 0.1 + buildBonus * 0.05 + styleWeaponBonus(team, style) + rolePower;
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
  const igl = activeRolePlayer(match.userTeam, "IGL");
  const tacticalRead = igl ? 1 + igl.skills.decisionMaking * 0.045 : 0;
  const fragger = activeRolePlayer(match.userTeam, "FRAGGER");
  const entryPressure = fragger ? 1 + fragger.skills.aim * 0.055 : 0;
  const targetHealth = activePlayers(enemy).reduce((sum, player) => sum + player.health + player.shield, 0) / Math.max(1, activePlayers(enemy).length * 2);
  const strategyBonus = match.userTeam.strategy === "AGGRESSIVE" ? 4
    : match.userTeam.strategy === "PRUDENT" ? -2
    : match.userTeam.strategy === "OPPORTUNISTIC" ? (targetHealth < 65 ? 7 : -1)
    : 2;
  return Math.round(clamp(50 + (userPower - enemyPower) * 0.72 + positioning + buildAdvantage + tacticalRead + entryPressure + strategyBonus, 5, 95));
}
function fight(match: BattleMatch, random: SeededRandom, style?: "HEIGHT" | "MID" | "LOW" | "OUTSIDE", combatMode?: "FOCUS" | "BOXFIGHT", targetPlayerId?: string): FightReport {
  const enemy = findEnemy(match, match.stage === "DROP" ? match.selectedDropId : match.currentLocationId);
  if (!enemy) return { winProbability: 100, won: true, enemyTeamName: "Personne", enemyEliminations: 0, allyLosses: 0, summary: "Aucun adversaire sur ce spot : ton équipe sécurise la zone." };

  const allies = activePlayers(match.userTeam);
  const enemyAlive = alivePlayers(enemy);
  const baseProbability = getFightProbability(match, style);
  const averageAim = allies.reduce((sum, player) => sum + player.skills.aim + player.skills.teamwork, 0) / Math.max(1, allies.length) / 2;
  const averageBuild = allies.reduce((sum, player) => sum + player.skills.building, 0) / Math.max(1, allies.length);
  const fragger = activeRolePlayer(match.userTeam, "FRAGGER");
  const shotgun = match.userTeam.inventory.weapons.some(weapon => weapon.category === "SHOTGUN");
  const buildResources = match.userTeam.resources.wood + match.userTeam.resources.stone + match.userTeam.resources.metal;
  const focusBonus = combatMode === "FOCUS" ? averageAim * 0.075 + (fragger ? fragger.skills.aim * 0.04 : 0) : 0;
  const boxBonus = combatMode === "BOXFIGHT" ? averageBuild * 0.09 + (shotgun ? 5 : -2) + Math.min(5, buildResources / 300) : 0;
  const winProbability = Math.round(clamp(baseProbability + focusBonus + boxBonus, 5, 95));
  const won = random.next() * 100 < winProbability;

  // Focus fire concentrates every teammate on the selected opponent. Otherwise,
  // the squad prioritizes the weakest available target and retargets after a knock/elimination.
  const selectedTarget = enemyAlive.find(player => player.id === targetPlayerId);
  const support = activeRolePlayer(match.userTeam, "SUPPORT");
  const protection = support ? 0.12 + support.skills.teamwork * 0.002 : 0;
  let totalDamage = 0;
  let enemyEliminations = 0;
  const styleWeaponMultiplier = style === "HEIGHT" ? 1.08 : style === "OUTSIDE" ? 0.92 : 1;

  for (let index = 0; index < allies.length && enemyAlive.some(player => player.alive); index++) {
    const attacker = allies[index];
    const target = combatMode === "FOCUS" && selectedTarget?.alive
      ? selectedTarget
      : enemyAlive.filter(player => player.alive).sort((a, b) => (a.health + a.shield) - (b.health + b.shield))[0];
    if (!target) break;

    const weapons = match.userTeam.inventory.weapons;
    const preferred = combatMode === "BOXFIGHT"
      ? weapons.filter(weapon => weapon.category === "SHOTGUN").sort((a, b) => b.damage - a.damage)[0]
      : weapons.filter(weapon => ["ASSAULT_RIFLE", "SMG", "SNIPER"].includes(weapon.category)).sort((a, b) => b.damage - a.damage)[0];
    const weapon = preferred ?? weapons.slice().sort((a, b) => b.damage - a.damage)[0];
    const baseDamage = weapon?.damage ?? 42;
    const aimMultiplier = 0.72 + attacker.skills.aim * 0.005;
    const shotgunMultiplier = combatMode === "BOXFIGHT" ? (weapon?.category === "SHOTGUN" ? 1.38 : 0.78) : 1;
    const buildingMultiplier = combatMode === "BOXFIGHT" ? 0.9 + attacker.skills.building * 0.002 + Math.min(0.12, buildResources / 12500) : 1;
    const enemyBuild = combatMode === "BOXFIGHT"
      ? enemyAlive.reduce((sum, player) => sum + player.skills.building, 0) / Math.max(1, enemyAlive.length)
      : 0;
    const defensiveBuild = combatMode === "BOXFIGHT" ? 1 - Math.min(0.16, enemyBuild * 0.001 + (enemy.resources.wood + enemy.resources.stone + enemy.resources.metal) / 18000) : 1;
    const inflicted = Math.max(1, Math.round(baseDamage * aimMultiplier * shotgunMultiplier * buildingMultiplier * defensiveBuild * styleWeaponMultiplier));
    const shieldDamage = Math.min(target.shield, inflicted);
    target.shield -= shieldDamage;
    const healthDamage = Math.min(target.health, inflicted - shieldDamage);
    target.health -= healthDamage;
    const actualDamage = shieldDamage + healthDamage;
    attacker.damageDealt += actualDamage;
    match.userTeam.damageDealt += actualDamage;
    totalDamage += actualDamage;

    if (target.health <= 0) {
      eliminatePlayer(target);
      attacker.eliminations += 1;
      match.userTeam.eliminations += 1;
      enemyEliminations += 1;
      event(match, "ELIMINATION", "Élimination", `${attacker.name} (${match.userTeam.name}) élimine ${target.name} (${enemy.name}) après ${actualDamage} dégâts.`);
    }
  }

  const allyLosses = won
    ? (random.next() < 0.12 * (1 - protection) ? 1 : 0)
    : Math.max(0, Math.min(allies.length, random.nextInt(1, Math.max(1, allies.length)) - (support ? 1 : 0)));
  for (let i = 0; i < allyLosses; i++) {
    const downed = allies[allies.length - 1 - i];
    if (downed && downed.alive) { downed.knocked = true; downed.health = 0; downed.shield = 0; }
  }
  if (!activePlayers(match.userTeam).length && match.userTeam.players.some(player => player.knocked && player.alive)) {
    const enemyKiller = activePlayers(enemy)[0];
    for (const player of match.userTeam.players.filter(player => player.knocked && player.alive)) {
      eliminatePlayer(player);
      event(match, "ELIMINATION", "Élimination", `${enemyKiller?.name ?? enemy.name} (${enemy.name}) élimine ${player.name} (${match.userTeam.name}).`);
    }
  }
  if (!alivePlayers(enemy).length) {
    enemy.alive = false;
    enemy.placement = match.teamsRemaining;
    event(match, "INFO", "Équipe éliminée", `${enemy.name} est entièrement éliminée.`);
  }
  if (!alivePlayers(match.userTeam).length) match.userTeam.alive = false;
  const styleLabel = style ? ({ HEIGHT: "hauteur", MID: "milieu", LOW: "bas", OUTSIDE: "extérieur" }[style]) : "standard";
  const modeLabel = combatMode === "FOCUS" ? " en focus d'équipe" : combatMode === "BOXFIGHT" ? " en boxfight" : "";
  const summary = `${won ? "Avantage remporté" : "Échange perdu"} contre ${enemy.name}${modeLabel} (${styleLabel}) : ${totalDamage} dégâts infligés, ${enemyEliminations} élimination(s), ${allyLosses} mate(s) à terre.`;
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
  let attackerIndex = 0;
  for (const target of activePlayers(enemy)) {
    if (remaining <= 0) break;
    const attacker = active[attackerIndex++ % Math.max(1, active.length)];
    const shieldDamage = Math.min(target.shield, remaining);
    target.shield -= shieldDamage;
    remaining -= shieldDamage;
    let actual = shieldDamage;
    const healthDamage = Math.min(target.health, remaining);
    target.health -= healthDamage;
    remaining -= healthDamage;
    actual += healthDamage;
    inflicted += actual;
    if (attacker) attacker.damageDealt += actual;
    if (target.health <= 0) {
      eliminatePlayer(target);
      if (attacker) attacker.eliminations += 1;
      event(match, "ELIMINATION", "Élimination", `${attacker?.name ?? match.userTeam.name} (${match.userTeam.name}) élimine ${target.name} (${enemy.name}) après un tag de surge.`);
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
  const support = activeRolePlayer(team, "SUPPORT");
  target.health = Math.min(50, 30 + (support ? Math.round(support.skills.teamwork * 0.2) : 0));
  target.shield = 0;
  return `${target.name} est réanimé avec ${target.health} PV${support ? " grâce au Support" : ""}.`;
}
function healTeam(team: BattleTeam, itemDefinitionId?: string, playerId?: string): string {
  const support = activeRolePlayer(team, "SUPPORT");
  const supportMultiplier = support ? 1.15 + support.skills.teamwork * 0.001 : 1;
  const targets = team.players.filter(player => player.alive && !player.knocked && (player.health < 100 || player.shield < 100));
  const availableItems = team.inventory.items.filter(item => item.kind === "HEAL" && item.quantity > 0 && (!itemDefinitionId || item.definitionId === itemDefinitionId));
  if (!targets.length) return "Aucun mate actif n'a besoin de soins.";
  if (!availableItems.length) return "Aucun consommable de soin disponible.";

  // Select the player/item pair that restores the most missing effective HP,
  // respecting separate 100 HP and 100 shield caps.
  let best: { target: BattlePlayer; item: ItemStack; restored: number } | undefined;
  for (const target of targets) {
    if (playerId && target.id !== playerId) continue;
    for (const item of availableItems) {
      const healthGain = Math.min(100 - target.health, Math.round((item.heal ?? 0) * supportMultiplier));
      const shieldGain = Math.min(100 - target.shield, Math.round((item.shield ?? 0) * supportMultiplier));
      const restored = healthGain + shieldGain;
      if (restored > (best?.restored ?? 0)) best = { target, item, restored };
    }
  }
  if (!best || best.restored <= 0) return "Aucun soin adapté aux PV ou boucliers manquants.";
  const before = best.target.health + best.target.shield;
  best.target.health = Math.min(100, best.target.health + Math.round((best.item.heal ?? 0) * supportMultiplier));
  best.target.shield = Math.min(100, best.target.shield + Math.round((best.item.shield ?? 0) * supportMultiplier));
  best.item.quantity -= 1;
  if (best.item.quantity <= 0) team.inventory.items.splice(team.inventory.items.indexOf(best.item), 1);
  const restored = Math.round(best.target.health + best.target.shield - before);
  return `${best.target.name} récupère ${restored} PV/bouclier avec ${best.item.name} (PV ${best.target.health}/100 · bouclier ${best.target.shield}/100).`;
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
  if (match.mobileZoneActive && match.secondsUntilShrink <= 0 && match.secondsIntoShrink >= match.phases[5].shrinkSeconds) {
    // Zone 7 never stops: the safe circle follows a smooth, bounded path across the island.
    // Its target is updated every simulated second so every squad can react to the movement.
    const t = match.gameTimeSeconds / 34;
    const radius = match.phases[5].radius;
    const margin = radius + 180;
    const nextX = 5000 + Math.sin(t) * 1250 + Math.sin(t * 0.47) * 420;
    const nextY = 5000 + Math.cos(t * 0.79) * 1120 + Math.sin(t * 0.39) * 360;
    match.storm.x = clamp(nextX, margin, match.map.width - margin);
    match.storm.y = clamp(nextY, margin, match.map.height - margin);
    match.storm.radius = radius;
    match.stormTarget = { ...match.storm };
    return;
  }
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

  // Enemy squads choose a sensible destination inside the next circle.
  // In later zones, locations tagged as high ground receive a strong positioning bonus.
  for (const team of enemies) {
    const safeLocations = match.map.locations.filter(location =>
      isInsideStorm(location.x, location.y, match.stormTarget)
    );
    const candidates = safeLocations.length ? safeLocations : match.map.locations;
    const destination = candidates.map(location => {
      const distance = Math.hypot(location.x - team.position.x, location.y - team.position.y);
      const highGround = location.tags.some(tag => ["hauteur", "position", "hill", "high-ground"].includes(tag));
      const highGroundBonus = match.phaseIndex >= 4 && highGround ? 1500 : 0;
      const scoutBonus = activeRolePlayer(team, "SCOUT") ? 1.5 + roleSkill(team, "SCOUT", "gameSense") * 0.025 : 0;
      const lootBonus = location.lootQuality * ((team.strategy === "AGGRESSIVE" ? 5 : 3) + scoutBonus);
      const dangerWeight = team.strategy === "PRUDENT" ? 13 : team.strategy === "AGGRESSIVE" ? 3 : 8;
      const iglPlanning = activeRolePlayer(team, "IGL") ? 1 + roleSkill(team, "IGL", "decisionMaking") * 0.006 : 1;
      const dangerPenalty = location.danger * (match.phaseIndex >= 4 ? dangerWeight * 0.75 : dangerWeight) * iglPlanning;
      return { location, score: distance * 0.65 + dangerPenalty - lootBonus - highGroundBonus };
    }).sort((a, b) => a.score - b.score)[0]?.location;
    const targetX = destination?.x ?? match.stormTarget.x;
    const targetY = destination?.y ?? match.stormTarget.y;
    const dx = targetX - team.position.x;
    const dy = targetY - team.position.y;
    const distance = Math.hypot(dx, dy) || 1;
    const step = random.nextInt(180, 520);
    const driftX = random.nextInt(-110, 110);
    const driftY = random.nextInt(-110, 110);
    team.position = {
      x: Math.max(120, Math.min(mapWidth - 120, team.position.x + dx / distance * step + driftX)),
      y: Math.max(120, Math.min(mapHeight - 120, team.position.y + dy / distance * step + driftY)),
    };
  }

  // During the moving endgame every squad continually adjusts to the live circle.
  // The user's squad moves too; the four Zone 7 choices remain combat-positioning styles,
  // not extra action buttons for ordinary rotations.
  if (match.mobileZoneActive && match.phaseIndex >= 6) {
    const squads = match.teams.filter(team => team.alive);
    for (const team of squads) {
      const dx = match.storm.x - team.position.x;
      const dy = match.storm.y - team.position.y;
      const distance = Math.hypot(dx, dy);
      const outside = !isInsideStorm(team.position.x, team.position.y, match.storm);
      const desiredStep = outside ? 520 : distance > match.storm.radius * 0.55 ? 260 : 105;
      if (distance > 35) {
        const step = Math.min(distance, desiredStep);
        team.position = {
          x: Math.max(100, Math.min(mapWidth - 100, team.position.x + dx / distance * step)),
          y: Math.max(100, Math.min(mapHeight - 100, team.position.y + dy / distance * step)),
        };
      }
    }
  }

  // Supply drops appear in the mid-game at a safe POI and contain higher-rarity loot.
  if (match.phaseIndex >= 2 && match.phaseIndex <= 5 && !match.events.some(item => item.type === "SUPPLY_DROP")) {
    const safeDropLocations = match.map.locations.filter(location => isInsideStorm(location.x, location.y, match.stormTarget));
    const pool = safeDropLocations.length ? safeDropLocations : match.map.locations;
    const supplyLocation = pool[random.nextInt(0, pool.length - 1)];
    const supplyLoot = makeDrop(match, { ...supplyLocation, lootQuality: 100, lootAmount: 9 }, random).slice(0, 8);
    // Every crate guarantees at least one Epic weapon.
    const rarityOrder: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
    const guaranteedWeapon = supplyLoot.find(drop => drop.kind === "WEAPON");
    if (!guaranteedWeapon) {
      const weapon = WEAPONS[random.nextInt(0, WEAPONS.length - 1)];
      supplyLoot.push({
        id: `supply-weapon-${match.gameTimeSeconds}-${supplyLocation.id}`, kind: "WEAPON",
        name: weapon.name, definitionId: weapon.id, category: weapon.category, rarity: "EPIC",
        damage: Math.round(weapon.baseDamage * RARITY_MULTIPLIER.EPIC), quantity: 1,
      });
    } else if (rarityOrder.indexOf(guaranteedWeapon.rarity) < rarityOrder.indexOf("EPIC")) {
      const weapon = WEAPONS.find(item => item.id === guaranteedWeapon.definitionId);
      guaranteedWeapon.rarity = "EPIC";
      guaranteedWeapon.damage = Math.round((weapon?.baseDamage ?? guaranteedWeapon.damage ?? 40) * RARITY_MULTIPLIER.EPIC);
    }
    match.lootOnGround.push(...supplyLoot.map(drop => ({ ...drop, locationId: supplyLocation.id, isSupplyDrop: true })));
    event(match, "SUPPLY_DROP", "Ravitaillement aérien", `Un ravitaillement arrive à ${supplyLocation.name} : une arme ÉPIQUE ou supérieure est garantie. Le point est marqué sur la carte.`);
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
    if (!encounter) continue;
    const rival = encounter.other;
    const averageHealth = alivePlayers(team).reduce((sum, player) => sum + player.health + player.shield, 0) / Math.max(1, alivePlayers(team).length) / 200;
    const powerDifference = teamPower(team) - teamPower(rival);
    let willingnessToFight = encounterChance;
    // Squads with low health or a clear power disadvantage prefer to disengage.
    if (averageHealth < 0.4) willingnessToFight *= 0.3;
    else if (averageHealth < 0.65) willingnessToFight *= 0.6;
    if (powerDifference < -15) willingnessToFight *= 0.45;
    else if (powerDifference > 15) willingnessToFight *= 1.15;
    if (match.phaseIndex >= 4) willingnessToFight *= 1.1;
    if (team.strategy === "AGGRESSIVE") willingnessToFight *= 1.4;
    if (team.strategy === "PRUDENT") willingnessToFight *= 0.55;
    if (team.strategy === "OPPORTUNISTIC") willingnessToFight *= powerDifference > 0 ? 1.45 : 0.65;
    if (team.strategy === "STRATEGIC") willingnessToFight *= 0.9;
    const fragger = activeRolePlayer(team, "FRAGGER");
    if (fragger) willingnessToFight *= 0.9 + fragger.skills.aim * 0.002;
    const scout = activeRolePlayer(team, "SCOUT");
    if (scout && averageHealth > 0.45) willingnessToFight *= 1.05;
    if (random.next() > Math.min(0.9, willingnessToFight)) continue;

    engaged.add(team.id);
    engaged.add(rival.id);
    const winner = random.next() * 100 < clamp(50 + (teamPower(team) - teamPower(rival)) * 0.65, 12, 88) ? team : rival;
    const loser = winner.id === team.id ? rival : team;
    const victim = alivePlayers(loser)[random.nextInt(0, alivePlayers(loser).length - 1)];
    const killer = alivePlayers(winner)[random.nextInt(0, alivePlayers(winner).length - 1)];
    if (!victim || !killer) continue;

    eliminatePlayer(victim);
    winner.eliminations += 1;
    killer.eliminations += 1;
    const damage = random.nextInt(90, 180);
    winner.damageDealt += damage;
    killer.damageDealt += damage;
    event(match, "ELIMINATION", "Élimination", `${killer.name} (${winner.name}) élimine ${victim.name} (${loser.name}).`);

    // A losing squad can suffer a second elimination in a longer exchange.
    if (alivePlayers(loser).length > 0 && random.next() < 0.22) {
      const secondVictim = alivePlayers(loser)[0];
      const secondKiller = alivePlayers(winner)[0] ?? killer;
      eliminatePlayer(secondVictim);
      winner.eliminations += 1;
      secondKiller.eliminations += 1;
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
    case "FOCUS_FIRE": {
      const report = fight(match, random, undefined, "FOCUS", action.targetPlayerId);
      event(match, "FIGHT", "Focus d'équipe", `Concentration des tirs : ${report.summary}`);
      break;
    }
    case "BOXFIGHT": {
      const report = fight(match, random, "MID", "BOXFIGHT");
      event(match, "FIGHT", "Boxfight", `Combat rapproché : ${report.summary}`);
      break;
    }
    case "DISENGAGE": {
      const candidates = match.map.locations.filter(candidate => candidate.id !== match.currentLocationId && isInsideStorm(candidate.x, candidate.y, match.stormTarget));
      const pool = candidates.length ? candidates : match.map.locations.filter(candidate => candidate.id !== match.currentLocationId);
      const iglPlanning = activeRolePlayer(match.userTeam, "IGL") ? 1 + roleSkill(match.userTeam, "IGL", "decisionMaking") * 0.01 : 1;
      const destination = pool.sort((a, b) => ((a.danger * 3 * iglPlanning) + Math.hypot(a.x-match.stormTarget.x,a.y-match.stormTarget.y)*0.02) - ((b.danger * 3 * iglPlanning) + Math.hypot(b.x-match.stormTarget.x,b.y-match.stormTarget.y)*0.02))[0] ?? nearestLocation(match, random);
      moveTeam(match, destination);
      event(match, "INFO", "Désengagement", `Ton équipe rompt le combat et rejoint ${destination.name} pour se replacer.`);
      break;
    }
    case "PICKUP_LOOT": {
      const index = match.lootOnGround.findIndex(drop => drop.id === action.dropId);
      if (index < 0) { event(match, "INFO", "Loot indisponible", "Cet objet n'est plus au sol."); break; }
      const drop = match.lootOnGround[index];
      if (drop.locationId && drop.locationId !== match.currentLocationId) {
        const dropLocation = match.map.locations.find(location => location.id === drop.locationId);
        event(match, "INFO", "Loot trop éloigné", `Cet objet se trouve à ${dropLocation?.name ?? "un autre lieu"}.`);
        break;
      }
      if (drop.kind === "WEAPON" && match.userTeam.inventory.weapons.length >= match.userTeam.inventory.maxWeaponSlots) {
        const weaponIndex = match.userTeam.inventory.weapons.findIndex(weapon => weapon.id === action.replaceWeaponId);
        if (weaponIndex < 0) { event(match, "INFO", "Inventaire plein", "Choisis l'arme à remplacer pour ramasser cet équipement."); break; }
        const previous = match.userTeam.inventory.weapons[weaponIndex];
        match.userTeam.inventory.weapons[weaponIndex] = { id: drop.id, definitionId: drop.definitionId!, name: drop.name, category: drop.category!, rarity: drop.rarity, damage: drop.damage!, magazine: 30, ammo: 30 };
        match.lootOnGround.splice(index, 1);
        event(match, "LOOT", "Arme remplacée", `${drop.name} remplace ${previous.name}.`);
      } else {
        const collected = collectLoot(match.userTeam, [drop]);
        if (collected.collected.length) {
          match.lootOnGround.splice(index, 1);
          event(match, "LOOT", "Objet ramassé", `${drop.name} récupéré depuis le sol.`);
        }
      }
      break;
    }
    case "FIGHT_THEN_ROTATE": {
      fight(match, random);
      if (match.userTeam.alive) {
        const destination = match.map.locations.find(l => l.id === action.locationId) ?? nearestLocation(match, random);
        moveTeam(match, destination);
      }
      break;
    }
    case "FIGHT_HEIGHT": {
      fight(match, random, "HEIGHT");
      break;
    }
    case "FIGHT_MID": {
      fight(match, random, "MID");
      break;
    }
    case "FIGHT_LOW": {
      fight(match, random, "LOW");
      break;
    }
    case "FIGHT_OUTSIDE": {
      fight(match, random, "OUTSIDE");
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
      const otherLocations = match.map.locations.filter(candidate => candidate.id !== match.currentLocationId);
      const safeLocations = otherLocations.filter(candidate => isInsideStorm(candidate.x, candidate.y, match.stormTarget));
      const destinationPool = safeLocations.length ? safeLocations : otherLocations;
      const destination = destinationPool.sort((a, b) => Math.hypot(a.x - match.stormTarget.x, a.y - match.stormTarget.y) - Math.hypot(b.x - match.stormTarget.x, b.y - match.stormTarget.y))[0] ?? nearestLocation(match, random);
      event(match, "FARM", "Farm à moitié", `Récolte intermédiaire : +${gained} matériaux, objectif 250 par type. Rotation anticipée vers ${destination.name}.`);
      moveTeam(match, destination);
      break;
    }
    case "FARM_SURGE": farmSurgeTags(match, random); break;
    case "ROTATE": {
      const destination = match.map.locations.find(l => l.id === action.locationId) ?? nearestLocation(match, random);
      moveTeam(match, destination);
      if (random.next() < destination.danger / 220 * rotationRiskMultiplier(match.userTeam)) {
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
    case "REBOOT": {
      const target = match.userTeam.players.find(player => !player.alive && !player.rebooted && (!action.playerId || player.id === action.playerId));
      if (match.phaseIndex >= 6 || match.userTeam.rebootTokens <= 0 || activePlayers(match.userTeam).length <= 0 || !target) {
        event(match, "INFO", "Reboot indisponible", "Il faut un mate actif, un jeton de reboot et être avant le dernier cercle.");
        break;
      }
      target.alive = true; target.knocked = false; target.health = 100; target.shield = 0; target.rebooted = true;
      match.userTeam.rebootTokens -= 1;
      event(match, "INFO", "Mate rebooté", `${target.name} revient en partie avec 100 PV. Jetons restants : ${match.userTeam.rebootTokens}.`);
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

function createBusTrajectory(random: SeededRandom): BattleBusState["trajectory"] {
  const width = BATTLE_ROYALE_MAP.width, height = BATTLE_ROYALE_MAP.height;
  const firstSide = random.nextInt(0, 3);
  let secondSide = random.nextInt(0, 3);
  while (secondSide === firstSide) secondSide = (secondSide + 1) % 4;
  const edge = (side: number) => side === 0 ? { x: 0, y: random.nextInt(700, height - 700) }
    : side === 1 ? { x: width, y: random.nextInt(700, height - 700) }
    : side === 2 ? { x: random.nextInt(700, width - 700), y: 0 }
    : { x: random.nextInt(700, width - 700), y: height };
  const start = edge(firstSide), end = edge(secondSide);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const durationSeconds = 58;
  return { start, end, speed: distance / durationSeconds, durationSeconds };
}
function busPositionAt(trajectory: BattleBusState["trajectory"], seconds: number) {
  const t = clamp(seconds / Math.max(1, trajectory.durationSeconds), 0, 1);
  return { x: trajectory.start.x + (trajectory.end.x - trajectory.start.x) * t, y: trajectory.start.y + (trajectory.end.y - trajectory.start.y) * t };
}
function makeBusFlightPlan(team: BattleTeam, destinationId: string, trajectory: BattleBusState["trajectory"]): BusFlightPlan {
  const destination = BATTLE_ROYALE_MAP.locations.find(location => location.id === destinationId);
  if (!destination) throw new Error("Destination de Battle Bus inconnue.");
  const dx = trajectory.end.x - trajectory.start.x, dy = trajectory.end.y - trajectory.start.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = clamp(((destination.x - trajectory.start.x) * dx + (destination.y - trajectory.start.y) * dy) / lengthSquared, 0, 1);
  const projected = { x: trajectory.start.x + dx * progress, y: trajectory.start.y + dy * progress };
  const perpendicular = Math.hypot(destination.x - projected.x, destination.y - projected.y);
  const descentDurationSeconds = Math.max(9, Math.min(24, perpendicular / 145));
  const closestTime = progress * trajectory.durationSeconds;
  const jumpAtSeconds = Math.max(0, Math.min(trajectory.durationSeconds - 1, closestTime - descentDurationSeconds * 0.62));
  return { teamId: team.id, destinationId, jumpAtSeconds: Number(jumpAtSeconds.toFixed(1)), jumpedAtSeconds: null, landedAtSeconds: null, status: "ON_BUS", jumpOrigin: null, descentDurationSeconds: Number(descentDurationSeconds.toFixed(1)) };
}
function chooseBotDestination(team: BattleTeam, random: SeededRandom, trajectory: BattleBusState["trajectory"]): string {
  const scored = BATTLE_ROYALE_MAP.locations.map(location => {
    const dx = trajectory.end.x - trajectory.start.x, dy = trajectory.end.y - trajectory.start.y;
    const len = dx * dx + dy * dy;
    const t = clamp(((location.x - trajectory.start.x) * dx + (location.y - trajectory.start.y) * dy) / len, 0, 1);
    const nearest = { x: trajectory.start.x + dx * t, y: trajectory.start.y + dy * t };
    const busDistance = Math.hypot(location.x - nearest.x, location.y - nearest.y);
    const dangerWeight = team.strategy === "AGGRESSIVE" ? 0.08 : team.strategy === "PRUDENT" ? 0.28 : 0.17;
    const lootWeight = team.strategy === "AGGRESSIVE" ? 0.23 : 0.17;
    const score = location.lootQuality * lootWeight + location.lootAmount * 1.8 + location.resourceRichness * 0.08 - location.danger * dangerWeight - busDistance / 180 + random.next() * 12;
    return { id: location.id, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0].id;
}
function createBattleBus(random: SeededRandom, teams: BattleTeam[], userDropLocationId: string): BattleBusState {
  const trajectory = createBusTrajectory(random);
  const plans = teams.map(team => makeBusFlightPlan(team, team.isUser ? userDropLocationId : chooseBotDestination(team, random, trajectory), trajectory));
  for (const team of teams) {
    const plan = plans.find(candidate => candidate.teamId === team.id)!;
    team.dropLocationId = plan.destinationId;
    team.position = { ...trajectory.start };
  }
  return { trajectory, elapsedSeconds: 0, durationSeconds: trajectory.durationSeconds, position: { ...trajectory.start }, status: "IN_PROGRESS", plans };
}
export function setBattleBusDestination(match: BattleMatch, locationId: string): BattleMatch {
  if (match.stage !== "DROP" || match.bus.status === "COMPLETE") throw new Error("La phase Battle Bus est terminée.");
  const plan = match.bus.plans.find(candidate => candidate.teamId === match.userTeam.id);
  if (!plan || plan.status !== "ON_BUS") throw new Error("Ton équipe a déjà sauté.");
  if (!match.map.locations.some(location => location.id === locationId)) throw new Error("POI inconnu.");
  plan.destinationId = locationId;
  const replacement = makeBusFlightPlan(match.userTeam, locationId, match.bus.trajectory);
  plan.jumpAtSeconds = Math.max(match.bus.elapsedSeconds, replacement.jumpAtSeconds);
  plan.descentDurationSeconds = replacement.descentDurationSeconds;
  match.userTeam.dropLocationId = locationId;
  match.selectedDropId = locationId;
  match.currentLocationId = locationId;
  event(match, "DROP", "Destination modifiée", "Ton équipe vise maintenant " + match.map.locations.find(location => location.id === locationId)!.name + ".");
  return match;
}
export function jumpBattleBus(match: BattleMatch): BattleMatch {
  if (match.stage !== "DROP" || match.bus.status === "COMPLETE") throw new Error("La phase Battle Bus est terminée.");
  const plan = match.bus.plans.find(candidate => candidate.teamId === match.userTeam.id);
  if (!plan || plan.status !== "ON_BUS") throw new Error("Ton équipe a déjà sauté.");
  plan.jumpedAtSeconds = match.bus.elapsedSeconds;
  plan.jumpOrigin = { ...match.bus.position };
  plan.status = "DESCENDING";
  event(match, "DROP", "Saut confirmé", "Ton équipe quitte le Battle Bus en direction de " + match.map.locations.find(location => location.id === plan.destinationId)!.name + ".");
  return match;
}
export function advanceBattleBus(match: BattleMatch, seconds = 1): BattleMatch {
  if (match.stage !== "DROP" || match.bus.status === "COMPLETE") return match;
  for (let tick = 0; tick < Math.max(1, Math.floor(seconds)); tick++) {
    match.bus.elapsedSeconds = Math.min(match.bus.durationSeconds, match.bus.elapsedSeconds + 1);
    match.bus.position = busPositionAt(match.bus.trajectory, match.bus.elapsedSeconds);
    for (const plan of match.bus.plans) {
      const team = match.teams.find(candidate => candidate.id === plan.teamId);
      if (!team || !team.alive || plan.status === "LANDED") continue;
      if (plan.status === "ON_BUS" && (match.bus.elapsedSeconds >= plan.jumpAtSeconds || match.bus.elapsedSeconds >= match.bus.durationSeconds)) {
        plan.jumpedAtSeconds = match.bus.elapsedSeconds;
        plan.jumpOrigin = { ...match.bus.position };
        plan.status = "DESCENDING";
        if (team.isUser) event(match, "DROP", "Saut de l'IGL", "Le timing recommandé est atteint. Ton équipe descend vers " + match.map.locations.find(location => location.id === plan.destinationId)!.name + ".");
      }
      if (plan.status === "DESCENDING" && plan.jumpedAtSeconds !== null && plan.jumpOrigin) {
        const progress = clamp((match.bus.elapsedSeconds - plan.jumpedAtSeconds) / plan.descentDurationSeconds, 0, 1);
        const destination = match.map.locations.find(location => location.id === plan.destinationId)!;
        team.position = { x: plan.jumpOrigin.x + (destination.x - plan.jumpOrigin.x) * progress, y: plan.jumpOrigin.y + (destination.y - plan.jumpOrigin.y) * progress };
        if (progress >= 1) {
          plan.status = "LANDED";
          plan.landedAtSeconds = match.bus.elapsedSeconds;
          team.position = { x: destination.x, y: destination.y };
          if (team.isUser) event(match, "DROP", "Atterrissage confirmé", "Ton équipe atterrit à " + destination.name + ".");
        }
      }
    }
    if (match.bus.elapsedSeconds >= match.bus.durationSeconds && match.bus.plans.some(plan => plan.status === "ON_BUS")) {
      for (const plan of match.bus.plans.filter(candidate => candidate.status === "ON_BUS")) {
        plan.jumpedAtSeconds = match.bus.elapsedSeconds;
        plan.jumpOrigin = { ...match.bus.position };
        plan.status = "DESCENDING";
      }
    }
    const allLanded = match.bus.plans.every(plan => plan.status === "LANDED" || !match.teams.find(team => team.id === plan.teamId)?.alive);
    match.bus.status = allLanded ? "COMPLETE" : match.bus.elapsedSeconds >= match.bus.durationSeconds ? "DESCENT" : "IN_PROGRESS";
    if (allLanded) {
      event(match, "DROP", "Phase Battle Bus terminée", "Toutes les équipes ont atterri. La phase de loot et de contestation peut commencer.");
      break;
    }
  }
  return match;
}

export function createBattleRoyale(seed: number, mode: BattleMatch["mode"], dropLocationId: string, teamNames = ["Ton équipe"], playerRatings?: number[], userStrategy: BattleMatch["userTeam"]["strategy"] = "STRATEGIC"): BattleMatch {
  if (!Number.isInteger(seed)) throw new Error("La seed doit être un entier.");
  if (playerRatings && (playerRatings.length !== TEAM_SIZE[mode] || playerRatings.some(rating => !Number.isFinite(rating) || rating < 0 || rating > 100))) {
    throw new Error(`Il faut fournir ${TEAM_SIZE[mode]} notes de joueurs comprises entre 0 et 100.`);
  }
  const random = new SeededRandom(seed);
  const location = BATTLE_ROYALE_MAP.locations.find(l => l.id === dropLocationId);
  if (!location) throw new Error("Point d'atterrissage inconnu.");
  const userTeam = createTeam("user-team", teamNames[0] ?? "Ton équipe", true, mode, location.id, location.x, location.y, random, 72, playerRatings, userStrategy);
  const teams: BattleTeam[] = [userTeam];
  const totalTeams = Math.floor(100 / TEAM_SIZE[mode]);
  for (let i = 0; i < totalTeams - 1; i++) {
    const poi = BATTLE_ROYALE_MAP.locations[random.nextInt(0, BATTLE_ROYALE_MAP.locations.length - 1)];
    const botStrategy = (["PRUDENT", "AGGRESSIVE", "STRATEGIC", "OPPORTUNISTIC"] as const)[random.nextInt(0, 3)];
    const bot = createTeam(`bot-${i + 1}`, `Team ${String(i + 1).padStart(2, "0")}`, false, mode, poi.id, poi.x + random.nextInt(-120, 120), poi.y + random.nextInt(-120, 120), random, undefined, undefined, botStrategy);
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
    map: BATTLE_ROYALE_MAP, bus: createBattleBus(random, teams, location.id), userTeam, teams, selectedDropId: location.id, currentLocationId: location.id,
    storm: { x: 5000, y: 5000, radius: 5000 }, stormTarget: { x: 5000, y: 5000, radius: 5000 }, phases: ZONE_PHASES, phaseIndex: 0, mobileZoneActive: false,
    secondsUntilShrink: ZONE_PHASES[0].waitSeconds, secondsIntoShrink: 0,
    gameTimeSeconds: 0, stormDamageTaken: 0, surgeDamageTaken: 0, surgeThreshold: 150, stormSurgeActive: false, lastSurgePulse: 0,
    lootOnGround: [], events: [], teamsRemaining: teams.length, playersRemaining: teams.reduce((n,t) => n + t.players.length, 0),
    startedAt: Date.now(), finishedAt: null, finalPlacement: null, placementPoints: 0, eliminationPoints: 0, totalPoints: 0, result: null,
  };
  event(match, "DROP", "Battle Bus en approche", `Trajectoire générée. Ton IGL recommande un saut à ${Math.round(match.bus.plans.find(plan => plan.teamId === userTeam.id)!.jumpAtSeconds)} s vers ${location.name}. Les autres équipes choisissent leur propre timing.`);
  match.surgeThreshold = Math.max(100, activePlayers(userTeam).length * 100);
  return match;
}
export function resolveDrop(match: BattleMatch, action: Extract<BattleAction, { type: "FIGHT" | "LOOT" | "ROTATE" }>): BattleMatch {
  if (match.stage !== "DROP") throw new Error("Le choix de spawn a déjà été effectué.");
  // Compatibility for direct simulation callers: resolving the drop fast-forwards any remaining flight.
  for (const plan of match.bus.plans) {
    const team = match.teams.find(candidate => candidate.id === plan.teamId);
    const destination = match.map.locations.find(location => location.id === plan.destinationId);
    if (team && destination) { team.position = { x: destination.x, y: destination.y }; plan.status = "LANDED"; plan.landedAtSeconds = match.bus.elapsedSeconds; }
  }
  match.bus.status = "COMPLETE";
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
  // Inventory and teammate interactions are quick decisions; they do not consume an entire storm phase.
  if (["PICKUP_LOOT", "HEAL", "REVIVE", "REBOOT"].includes(action.type)) {
    updateCounts(match);
    return match;
  }
  if (!isFinished(match)) simulateWorldTick(match, random);
  if (isFinished(match)) return match;
  match.stage = "ZONE";
  if (match.phaseIndex >= 6) {
    // Zone 7 is a true moving endgame: resolve one chosen fight per decision,
    // but keep the match alive until only one squad remains.
    updateCounts(match);
    if (!isFinished(match) && match.teamsRemaining <= 1) finishMatch(match, match.userTeam.alive ? "WIN" : "ELIMINATED");
    // If the user's squad has been eliminated, advanceMatchTime keeps simulating
    // the remaining AI squads until the last team wins.
    return match;
  }
  const next = match.phases[match.phaseIndex];
  match.stormTarget = nextStormCircle(match.stormTarget, next.radius, random);
  match.secondsUntilShrink = next.waitSeconds;
  match.secondsIntoShrink = 0;
  match.phaseIndex += 1;
  if (match.phaseIndex >= 6) { match.mobileZoneActive = true; event(match, "STORM", "Zone mobile", "Le dernier cercle commence à se déplacer : adapte ta position en continu."); }
  updateSurge(match);
  updateCounts(match);
  return match;
}
export function getActionOptions(match: BattleMatch): Array<{ type: ActionType; label: string; description: string; risk: "LOW" | "MEDIUM" | "HIGH" }> {
  const options: Array<{ type: ActionType; label: string; description: string; risk: "LOW" | "MEDIUM" | "HIGH" }> = match.stage === "DROP" ? [
    { type: "FIGHT", label: "Atterrir ici malgré la contestation", description: "Prendre le fight au spawn si une équipe adverse est présente.", risk: "HIGH" },
    { type: "LOOT", label: "Atterrir ici et loot librement", description: "Sécuriser le spot et récupérer le premier équipement.", risk: "MEDIUM" },
    { type: "ROTATE", label: "Changer de point de spawn", description: "Choisir un autre lieu pour éviter une équipe adverse.", risk: "LOW" },
  ] : match.phaseIndex === 1 ? [
    { type: "LOOT", label: "Explorer le spot et ouvrir les coffres", description: "Récupérer armes, soins, munitions et matériaux.", risk: "LOW" },
    { type: "FIGHT", label: "Prendre un fight", description: "Engager une équipe contestataire.", risk: "HIGH" },
    { type: "FARM_FULL", label: "Farm complet · 500/500", description: "Récolter 500 bois, pierre et métal.", risk: "LOW" },
    { type: "FARM_HALF_ROTATE", label: "Farm à moitié puis rotate", description: "Atteindre 250 de chaque matériau puis partir.", risk: "LOW" },
    { type: "FARM_SURGE", label: "Prendre des tags pour la surge", description: "Infliger des dégâts pour augmenter le score de surge.", risk: "MEDIUM" },
  ] : match.phaseIndex === 2 ? [
    { type: "ROTATE", label: "Rotation sécurisée", description: "Rejoindre le prochain cercle.", risk: "LOW" },
    { type: "FIGHT_THEN_ROTATE", label: "Fight puis rotation", description: "Prendre un combat avant de partir.", risk: "HIGH" },
    { type: "DISENGAGE", label: "Se désengager", description: "Privilégier un trajet moins dangereux vers la zone.", risk: "LOW" },
    { type: "FARM_SURGE", label: "Farmer la surge", description: "Prendre des tags pour atteindre le seuil.", risk: "MEDIUM" },
  ] : match.phaseIndex === 3 ? [
    { type: "FOCUS_FIRE", label: "Focus une équipe", description: "Concentrer les tirs sur une cible prioritaire.", risk: "HIGH" },
    { type: "FIGHT", label: "Prendre un fight sur la rotation", description: "Comparer les notes, les PV, les boucliers et l'équipement.", risk: "HIGH" },
    { type: "ROTATE", label: "Avancer vers la prochaine zone", description: "Prendre de l'avance sur la tempête.", risk: "MEDIUM" },
    { type: "REFRESH", label: "Refresh matériaux", description: "Compléter progressivement les ressources.", risk: "LOW" },
    { type: "FARM_SURGE", label: "Farmer la surge", description: "Infliger les dégâts manquants aux adversaires.", risk: "MEDIUM" },
  ] : match.phaseIndex === 4 || match.phaseIndex === 5 ? [
    { type: "FOCUS_FIRE", label: "Focus une équipe", description: "Chercher une élimination rapide.", risk: "HIGH" },
    { type: "BOXFIGHT", label: "Prendre un boxfight", description: "Le build, le placement et les pompes influencent le combat rapproché.", risk: "HIGH" },
    { type: "ROTATE", label: "Prendre une bonne position", description: "Rejoindre le prochain cercle.", risk: "MEDIUM" },
    { type: "DISENGAGE", label: "Se désengager", description: "Quitter un combat défavorable pour survivre.", risk: "LOW" },
    { type: "REFRESH", label: "Refresh matériaux", description: "Compléter les ressources avant le dernier cercle.", risk: "LOW" },
  ] : [
    { type: "FIGHT_HEIGHT", label: "Prendre la hauteur", description: "Synergie renforcée avec fusils d'assaut et snipers.", risk: "HIGH" },
    { type: "FIGHT_MID", label: "Jouer au milieu", description: "Synergie renforcée avec les pompes.", risk: "HIGH" },
    { type: "FIGHT_LOW", label: "Jouer en bas", description: "Synergie renforcée avec les SMG et les pompes.", risk: "HIGH" },
    { type: "FIGHT_OUTSIDE", label: "Jouer extérieur", description: "Synergie avec les armes à distance et objets utilitaires.", risk: "HIGH" },
  ];
  const canReboot = match.phaseIndex < 6 && match.userTeam.rebootTokens > 0 && activePlayers(match.userTeam).length > 0 && match.userTeam.players.some(player => !player.alive && !player.rebooted);
  if (canReboot) options.push({ type: "REBOOT", label: "Reboot un mate éliminé", description: "Un jeton disponible permet de faire revenir un joueur avant le dernier cercle.", risk: "MEDIUM" });
  const canRevive = match.userTeam.players.some(player => player.alive && player.knocked) && activePlayers(match.userTeam).length > 0;
  if (canRevive && match.phaseIndex < 6) options.push({ type: "REVIVE", label: "Réanimer un équipier", description: "Un équipier à terre revient avec 30 PV.", risk: "MEDIUM" });
  const needsHealing = match.userTeam.players.some(player => player.alive && !player.knocked && (player.health < 100 || player.shield < 100));
  if (needsHealing && match.phaseIndex < 6 && match.userTeam.inventory.items.some(item => item.kind === "HEAL" && item.quantity > 0)) options.push({ type: "HEAL", label: "Utiliser un soin", description: "Soigner le joueur le plus affaibli.", risk: "LOW" });
  if (match.phaseIndex >= 3 && match.phaseIndex < 6) options.push({ type: "HOLD_POSITION", label: "Construire une position défensive", description: "Dépenser 10 matériaux pour sécuriser la position.", risk: "LOW" });
  return options;
}
export function getRarityRollTable(): ReadonlyArray<{ rarity: Rarity; weight: number }> {
  return rarityWeights.map(([rarity, weight]) => ({ rarity, weight }));
}
export function getInventorySummary(team: BattleTeam): { weapons: WeaponInstance[]; items: ItemStack[]; resources: Resources } {
  return { weapons: team.inventory.weapons, items: team.inventory.items, resources: team.resources };
}
