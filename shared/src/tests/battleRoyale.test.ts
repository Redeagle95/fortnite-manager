import { describe, expect, it } from "vitest";
import { advanceMatchTime, createBattleRoyale, getActionOptions, getFightProbability, getInventorySummary, resolveDrop, takeZoneAction } from "../battle-royale";

describe("Battle Royale simulation", () => {
  it("moves enemy squads on the map as the match advances", () => {
    const match = createBattleRoyale(4242, "DUO", "pine-woods");
    const before = match.teams.filter(team => !team.isUser).map(team => ({ id: team.id, x: team.position.x, y: team.position.y }));
    resolveDrop(match, { type: "LOOT" });
    const moved = before.some(position => {
      const team = match.teams.find(candidate => candidate.id === position.id)!;
      return team.position.x !== position.x || team.position.y !== position.y;
    });
    expect(moved).toBe(true);
  });

  it("farms to full or half materials and rotates early", () => {
    const full = createBattleRoyale(6101, "TRIO", "pine-woods");
    resolveDrop(full, { type: "LOOT" });
    takeZoneAction(full, { type: "FARM_FULL" });
    expect(full.userTeam.resources).toEqual({ wood: 500, stone: 500, metal: 500 });

    const half = createBattleRoyale(6102, "TRIO", "pine-woods");
    resolveDrop(half, { type: "LOOT" });
    const before = { ...half.userTeam.position };
    takeZoneAction(half, { type: "FARM_HALF_ROTATE" });
    expect(half.userTeam.resources).toEqual({ wood: 250, stone: 250, metal: 250 });
    expect(half.userTeam.position).not.toEqual(before);
  });

  it("records storm damage over live simulation time", () => {
    const match = createBattleRoyale(6103, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.position = { x: 9900, y: 9900 };
    match.storm = { x: 5000, y: 5000, radius: 100 };
    advanceMatchTime(match, 5);
    expect(match.stormDamageTaken).toBe(5);
    expect(match.userTeam.players[0].health).toBe(95);
  });

  it("adds real opponent damage when farming surge tags", () => {
    const match = createBattleRoyale(6104, "TRIO", "pine-woods");
    resolveDrop(match, { type: "ROTATE" });
    const sameSpot = match.teams.filter(team => !team.isUser && team.alive && team.dropLocationId === match.currentLocationId);
    const enemies = sameSpot.length ? sameSpot : match.teams.filter(team => !team.isUser && team.alive);
    const enemy = enemies.sort((a, b) => Math.hypot(a.position.x - match.userTeam.position.x, a.position.y - match.userTeam.position.y) - Math.hypot(b.position.x - match.userTeam.position.x, b.position.y - match.userTeam.position.y))[0];
    const before = enemy.players.reduce((sum, player) => sum + player.health + player.shield, 0);
    takeZoneAction(match, { type: "FARM_SURGE" });
    const after = enemy.players.reduce((sum, player) => sum + player.health + player.shield, 0);
    expect(match.userTeam.damageDealt).toBeGreaterThan(0);
    expect(match.userTeam.damageDealt).toBe(match.userTeam.players.reduce((sum, player) => sum + player.damageDealt, 0));
    expect(after).toBeLessThan(before);
    expect(match.events.some(item => item.type === "SURGE")).toBe(true);
  });

  it("applies storm surge pulses when the team's damage threshold is missed", () => {
    const match = createBattleRoyale(6105, "TRIO", "pine-woods");
    match.stage = "ZONE";
    match.phaseIndex = 3;
    match.stormSurgeActive = true;
    match.surgeThreshold = 300;
    advanceMatchTime(match, 5);
    expect(match.stormSurgeActive).toBe(true);
    expect(match.surgeDamageTaken).toBe(25);
  });

  it("creates a full lobby and offers spawn decisions", () => {
    const match = createBattleRoyale(42, "TRIO", "tilted-district");
    expect(match.teams).toHaveLength(33);
    expect(match.playersRemaining).toBe(99);
    expect(match.userTeam.players).toHaveLength(3);
    expect(match.stage).toBe("DROP");
    expect(getActionOptions(match).map(a => a.type)).toEqual(["FIGHT", "LOOT", "ROTATE"]);
  });

  it("loots a spawn and advances through zone actions", () => {
    const match = createBattleRoyale(123, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    expect(match.stage).not.toBe("DROP");
    expect(getInventorySummary(match.userTeam).weapons.length).toBeLessThanOrEqual(5);
    takeZoneAction(match, { type: "REFRESH", material: "WOOD" });
    expect(match.userTeam.resources.wood).toBeGreaterThan(0);
    expect(match.phaseIndex).toBe(2);
  });

  it("rejects a second spawn decision", () => {
    const match = createBattleRoyale(7, "SOLO", "quiet-farm");
    resolveDrop(match, { type: "LOOT" });
    expect(() => resolveDrop(match, { type: "FIGHT" })).toThrow();
  });

  it("keeps every generated weapon rarity in the six-tier system", () => {
    const match = createBattleRoyale(99, "SQUAD", "red-factory");
    resolveDrop(match, { type: "LOOT" });
    for (const weapon of match.userTeam.inventory.weapons) {
      expect(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]).toContain(weapon.rarity);
    }
  });

  it("allows an active teammate to revive a knocked teammate", () => {
    const match = createBattleRoyale(321, "TRIO", "lake-outpost");
    resolveDrop(match, { type: "LOOT" });
    const target = match.userTeam.players[1];
    target.knocked = true;
    target.health = 0;
    takeZoneAction(match, { type: "REVIVE", playerId: target.id });
    expect(target.knocked).toBe(false);
    expect(target.alive).toBe(true);
    expect(target.health).toBeGreaterThan(0);
  });
  it("shrinks the storm over time and exposes late-game decisions", () => {
    const match = createBattleRoyale(888, "TRIO", "pine-woods");
    match.stage = "ZONE";
    match.phaseIndex = 1;
    match.stormTarget = { x: 5000, y: 5000, radius: 4200 };
    match.secondsUntilShrink = 150;
    match.secondsIntoShrink = 0;
    expect(match.storm.radius).toBe(5000);
    advanceMatchTime(match, 210);
    expect(match.storm.radius).toBe(4200);
    expect(match.phaseIndex).toBe(1);
    expect(getActionOptions(match).map(a => a.type)).toContain("FARM_FULL");
    match.phaseIndex = 6;
    expect(getActionOptions(match).map(a => a.type)).toEqual(expect.arrayContaining(["FIGHT_HEIGHT", "FIGHT_MID", "FIGHT_LOW", "FIGHT_OUTSIDE"]));
  });
  it("caps each material at 500", () => {
    const match = createBattleRoyale(889, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.resources.wood = 490;
    takeZoneAction(match, { type: "REFRESH", material: "WOOD" });
    expect(match.userTeam.resources.wood).toBeLessThanOrEqual(500);
  });

  it("uses weapon category synergy in final-zone estimates", () => {
    const match = createBattleRoyale(890, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.inventory.weapons = [{ id: "test-ar", definitionId: "assault-rifle", name: "Test AR", category: "ASSAULT_RIFLE", rarity: "LEGENDARY", damage: 45, magazine: 30, ammo: 30 }];
    expect(getFightProbability(match, "HEIGHT")).toBeGreaterThanOrEqual(getFightProbability(match, "LOW"));
  });

  it("uses six storm phases and reserves zone seven for the four final tactics", () => {
    const match = createBattleRoyale(891, "TRIO", "pine-woods");
    expect(match.phases).toHaveLength(6);
    resolveDrop(match, { type: "LOOT" });
    match.phaseIndex = 5;
    expect(getActionOptions(match).map(action => action.type)).toContain("ROTATE");
    match.phaseIndex = 6;
    expect(getActionOptions(match).map(action => action.type)).toEqual(
      expect.arrayContaining(["FIGHT_HEIGHT", "FIGHT_MID", "FIGHT_LOW", "FIGHT_OUTSIDE"])
    );
    expect(getActionOptions(match).map(action => action.type)).not.toContain("FARM_FULL");
  });

  it("applies the chosen IGL strategy and assigns squad roles", () => {
    const match = createBattleRoyale(9101, "SQUAD", "pine-woods", ["Equipe test"], [80, 75, 70, 65], "AGGRESSIVE");
    expect(match.userTeam.strategy).toBe("AGGRESSIVE");
    expect(match.userTeam.players.map(player => player.role)).toEqual(["IGL", "FRAGGER", "SUPPORT", "SCOUT"]);
  });

  it("awards placement and elimination points when the match ends", () => {
    const match = createBattleRoyale(9102, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.eliminations = 3;
    for (const team of match.teams) if (!team.isUser) { team.alive = false; for (const player of team.players) player.alive = false; }
    match.stage = "ZONE";
    match.phaseIndex = 6;
    takeZoneAction(match, { type: "FIGHT_HEIGHT" });
    expect(match.stage).toBe("FINISHED");
    expect(match.placementPoints).toBe(65);
    expect(match.eliminationPoints).toBe(6);
    expect(match.totalPoints).toBe(71);
  });

  it("offers focus-fire, boxfight, disengage, healing and hold-position choices", () => {
    const match = createBattleRoyale(9103, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.phaseIndex = 4;
    match.userTeam.inventory.items.push({definitionId:"small-shield",name:"Mini potion",rarity:"UNCOMMON",quantity:2,kind:"HEAL",shield:25});
    expect(getActionOptions(match).map(option => option.type)).toEqual(expect.arrayContaining(["FOCUS_FIRE","BOXFIGHT","DISENGAGE","HEAL","HOLD_POSITION"]));
  });

  it("moves the final safe zone during endgame", () => {
    const match = createBattleRoyale(9104, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.phaseIndex = 6;
    match.mobileZoneActive = true;
    match.storm = { x: 5000, y: 5000, radius: match.phases[5].radius };
    match.stormTarget = { ...match.storm };
    match.secondsIntoShrink = match.phases[5].shrinkSeconds;
    match.secondsUntilShrink = 0;
    const before = {...match.storm};
    advanceMatchTime(match, 20);
    expect(match.storm.x !== before.x || match.storm.y !== before.y).toBe(true);
  });
  it("keeps Zone 7 active after the user's elimination until one team remains", () => {
    const match = createBattleRoyale(9510, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.phaseIndex = 6;
    match.mobileZoneActive = true;
    match.userTeam.alive = false;
    for (const player of match.userTeam.players) player.alive = false;
    const aliveBot = match.teams.find(team => !team.isUser && team.alive)!;
    // Keep two bot squads alive so the match must continue in spectator mode.
    const secondBot = match.teams.find(team => !team.isUser && team.id !== aliveBot.id)!;
    aliveBot.alive = true;
    secondBot.alive = true;
    for (const team of match.teams) {
      if (team.id !== aliveBot.id && team.id !== secondBot.id) {
        team.alive = false;
        for (const player of team.players) player.alive = false;
      }
    }
    match.stage = "ZONE";
    advanceMatchTime(match, 1);
    expect(match.stage).toBe("ZONE");
    expect(match.result).toBe(null);
    expect(match.userTeam.placement).toBe(3);
  });

  it("keeps the four exclusive Zone 7 tactics while the user squad auto-rotates with the moving circle", () => {
    const match = createBattleRoyale(9511, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.phaseIndex = 6;
    match.mobileZoneActive = true;
    match.secondsUntilShrink = 0;
    match.secondsIntoShrink = match.phases[5].shrinkSeconds;
    match.storm = { x: 5000, y: 5000, radius: match.phases[5].radius };
    match.stormTarget = { ...match.storm };
    match.userTeam.position = { x: 900, y: 900 };
    const choices = getActionOptions(match).map(action => action.type);
    expect(choices).toEqual(["FIGHT_HEIGHT", "FIGHT_MID", "FIGHT_LOW", "FIGHT_OUTSIDE"]);
    const before = { ...match.userTeam.position };
    advanceMatchTime(match, 15);
    expect(match.userTeam.position.x !== before.x || match.userTeam.position.y !== before.y).toBe(true);
  });

  it("allows picking up ground loot and replacing a full weapon slot", () => {
    const match = createBattleRoyale(9105, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.userTeam.inventory.weapons = Array.from({length:5},(_,i)=>({id:"old-"+i,definitionId:"old-"+i,name:"Old weapon "+i,category:"ASSAULT_RIFLE" as const,rarity:"COMMON" as const,damage:20,magazine:30,ammo:30}));
    const drop = {id:"ground-weapon",kind:"WEAPON" as const,name:"New shotgun",definitionId:"pump-shotgun",category:"SHOTGUN" as const,rarity:"EPIC" as const,damage:100,quantity:1};
    match.lootOnGround.push(drop);
    const phaseBeforePickup = match.phaseIndex;
    takeZoneAction(match,{type:"PICKUP_LOOT",dropId:drop.id,replaceWeaponId:"old-0"});
    expect(match.phaseIndex).toBe(phaseBeforePickup);
    expect(match.userTeam.inventory.weapons[0].name).toBe("New shotgun");
    expect(match.lootOnGround.some(item=>item.id===drop.id)).toBe(false);
  });

  it("reboots one eliminated teammate using a limited team token", () => {
    const match = createBattleRoyale(9106, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const target = match.userTeam.players[1];
    target.alive = false;
    target.health = 0;
    expect(match.userTeam.rebootTokens).toBe(1);
    takeZoneAction(match, {type:"REBOOT",playerId:target.id});
    expect(target.alive).toBe(true);
    expect(target.health).toBe(100);
    expect(target.rebooted).toBe(true);
    expect(match.userTeam.rebootTokens).toBe(0);
  });

  it("keeps ground loot at its POI until the team rotates there", () => {
    const match = createBattleRoyale(9107, "DUO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const remote = match.map.locations.find(location => location.id !== match.currentLocationId)!;
    const drop = {id:"remote-supply-item",kind:"HEAL" as const,name:"Small shield",definitionId:"small-shield",rarity:"UNCOMMON" as const,quantity:1,locationId:remote.id,isSupplyDrop:true};
    match.lootOnGround.push(drop);
    takeZoneAction(match,{type:"PICKUP_LOOT",dropId:drop.id});
    expect(match.lootOnGround.some(item=>item.id===drop.id)).toBe(true);
    expect(match.userTeam.inventory.items.some(item=>item.definitionId==="small-shield")).toBe(false);
  });

  it("keeps the last zone restricted to height, mid, low and outside", () => {
    const match = createBattleRoyale(9108, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    match.phaseIndex = 6;
    match.userTeam.players[1].knocked = true;
    match.userTeam.inventory.items.push({definitionId:"small-shield",name:"Mini potion",rarity:"UNCOMMON",quantity:1,kind:"HEAL",shield:25});
    expect(getActionOptions(match).map(option => option.type)).toEqual(["FIGHT_HEIGHT","FIGHT_MID","FIGHT_LOW","FIGHT_OUTSIDE"]);
  });

  it("gives the IGL a measurable tactical and rotation advantage", () => {
    const match = createBattleRoyale(9201, "DUO", "pine-woods");
    const igl = match.userTeam.players[0];
    const originalRole = igl.role;
    igl.role = "SCOUT";
    const withoutIgl = getFightProbability(match);
    igl.role = originalRole;
    const withIgl = getFightProbability(match);
    expect(withIgl).toBeGreaterThan(withoutIgl);
  });

  it("gives the Fragger a measurable combat advantage", () => {
    const match = createBattleRoyale(9202, "DUO", "pine-woods");
    const fragger = match.userTeam.players[1];
    fragger.role = "SUPPORT";
    const withoutFragger = getFightProbability(match);
    fragger.role = "FRAGGER";
    const withFragger = getFightProbability(match);
    expect(withFragger).toBeGreaterThan(withoutFragger);
  });

  it("focus fire concentrates damage on the selected opponent and credits the individual player", () => {
    const match = createBattleRoyale(6110, "SOLO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const enemies = match.teams.filter(team => !team.isUser && team.alive);
    const samePoi = enemies.filter(team => team.dropLocationId === match.currentLocationId);
    const enemy = (samePoi.length ? samePoi : enemies).sort((a, b) =>
      Math.hypot(a.position.x - match.userTeam.position.x, a.position.y - match.userTeam.position.y)
      - Math.hypot(b.position.x - match.userTeam.position.x, b.position.y - match.userTeam.position.y))[0];
    const target = enemy.players.find(player => player.alive)!;
    target.health = 30;
    target.shield = 0;
    match.userTeam.inventory.weapons = [{id:"focus-rifle",definitionId:"focus-rifle",name:"Rifle",category:"ASSAULT_RIFLE",rarity:"RARE",damage:80,magazine:30,ammo:30}];
    takeZoneAction(match, { type: "FOCUS_FIRE", targetPlayerId: target.id });
    expect(target.alive).toBe(false);
    expect(match.userTeam.players[0].eliminations).toBe(1);
    expect(match.userTeam.players[0].damageDealt).toBeGreaterThanOrEqual(30);
    expect(match.userTeam.damageDealt).toBe(match.userTeam.players.reduce((sum, player) => sum + player.damageDealt, 0));
  });

  it("makes boxfight damage respond to shotgun choice, building skill and materials", () => {
    const standard = createBattleRoyale(6111, "DUO", "pine-woods");
    const boxfight = createBattleRoyale(6111, "DUO", "pine-woods");
    resolveDrop(standard, { type: "LOOT" });
    resolveDrop(boxfight, { type: "LOOT" });
    standard.userTeam.inventory.weapons = [{id:"standard-rifle",definitionId:"standard-rifle",name:"Rifle",category:"ASSAULT_RIFLE",rarity:"RARE",damage:55,magazine:30,ammo:30}];
    boxfight.userTeam.inventory.weapons = [{id:"box-shotgun",definitionId:"box-shotgun",name:"Pompe",category:"SHOTGUN",rarity:"RARE",damage:55,magazine:5,ammo:5}];
    for (const player of boxfight.userTeam.players) player.skills.building = 100;
    boxfight.userTeam.resources = {wood:500,stone:500,metal:500};
    for (const match of [standard, boxfight]) {
      const enemies = match.teams.filter(team => !team.isUser && team.alive);
      const samePoi = enemies.filter(team => team.dropLocationId === match.currentLocationId);
      const enemy = (samePoi.length ? samePoi : enemies).sort((a, b) =>
        Math.hypot(a.position.x - match.userTeam.position.x, a.position.y - match.userTeam.position.y)
        - Math.hypot(b.position.x - match.userTeam.position.x, b.position.y - match.userTeam.position.y))[0];
      for (const player of enemy.players.filter(player => player.alive)) player.health = 1000;
    }
    const standardBefore = standard.userTeam.damageDealt;
    const boxBefore = boxfight.userTeam.damageDealt;
    takeZoneAction(standard, { type: "FIGHT" });
    takeZoneAction(boxfight, { type: "BOXFIGHT" });
    expect(boxfight.userTeam.damageDealt - boxBefore).toBeGreaterThan(standard.userTeam.damageDealt - standardBefore);
  });

  it("disengages to another location without resolving an optional fight", () => {
    const match = createBattleRoyale(6112, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const previousLocation = match.currentLocationId;
    const previousDamage = match.userTeam.damageDealt;
    takeZoneAction(match, { type: "DISENGAGE" });
    expect(match.currentLocationId).not.toBe(previousLocation);
    expect(match.userTeam.damageDealt).toBe(previousDamage);
    expect(match.events.some(item => item.title === "Désengagement")).toBe(true);
  });

  it("automatically chooses the most useful heal for the teammate's missing health or shield", () => {
    const match = createBattleRoyale(6113, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const healthTarget = match.userTeam.players[1];
    const shieldTarget = match.userTeam.players[0];
    healthTarget.health = 40;
    healthTarget.shield = 100;
    shieldTarget.health = 100;
    shieldTarget.shield = 0;
    match.userTeam.inventory.items = [
      {definitionId:"mini-test",name:"Mini potion",rarity:"UNCOMMON",quantity:1,kind:"HEAL",shield:25},
      {definitionId:"medkit-test",name:"Medkit",rarity:"COMMON",quantity:1,kind:"HEAL",heal:50}
    ];
    takeZoneAction(match, { type: "HEAL" });
    expect(healthTarget.health).toBe(100);
    expect(healthTarget.shield).toBe(100);
    expect(shieldTarget.shield).toBe(0);
    expect(match.userTeam.inventory.items.some(item => item.definitionId === "medkit-test")).toBe(false);
  });

  it("makes Support improve healing and revive health", () => {
    const match = createBattleRoyale(9203, "TRIO", "pine-woods");
    resolveDrop(match, { type: "LOOT" });
    const support = match.userTeam.players.find(player => player.role === "SUPPORT")!;
    support.skills.teamwork = 100;
    const target = match.userTeam.players[1];
    target.health = 40;
    match.userTeam.inventory.items.push({definitionId:"test-medkit",name:"Medkit",rarity:"COMMON",quantity:1,kind:"HEAL",heal:40});
    takeZoneAction(match, {type:"HEAL",itemDefinitionId:"test-medkit",playerId:target.id});
    expect(target.health).toBe(90);
    target.knocked = true;
    target.health = 0;
    takeZoneAction(match, {type:"REVIVE",playerId:target.id});
    expect(target.health).toBe(50);
    expect(target.knocked).toBe(false);
  });

  it("makes Scout improve average loot rarity over repeated drops", () => {
    const rarityScore = {COMMON:1,UNCOMMON:2,RARE:3,EPIC:4,LEGENDARY:5,MYTHIC:6} as const;
    let regularScore = 0;
    let scoutScore = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const regular = createBattleRoyale(9300 + seed, "SQUAD", "pine-woods");
      const scouted = createBattleRoyale(9300 + seed, "SQUAD", "pine-woods");
      regular.userTeam.players[3].role = "SUPPORT";
      scouted.userTeam.players[3].role = "SCOUT";
      resolveDrop(regular, {type:"LOOT"});
      resolveDrop(scouted, {type:"LOOT"});
      regularScore += regular.userTeam.inventory.weapons.reduce((sum, weapon) => sum + rarityScore[weapon.rarity], 0);
      scoutScore += scouted.userTeam.inventory.weapons.reduce((sum, weapon) => sum + rarityScore[weapon.rarity], 0);
    }
    expect(scoutScore).toBeGreaterThan(regularScore);
  });

  it("makes the selected team strategy change combat odds", () => {
    const prudent = createBattleRoyale(9401, "DUO", "pine-woods", ["Prudents"], undefined, "PRUDENT");
    const aggressive = createBattleRoyale(9401, "DUO", "pine-woods", ["Agressifs"], undefined, "AGGRESSIVE");
    expect(getFightProbability(aggressive)).toBeGreaterThan(getFightProbability(prudent));
  });

});
