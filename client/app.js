const socket = io();
const $ = (id) => document.getElementById(id);
let currentMatch = null;
let selectedDrop = "tilted-district";
const modes = { SOLO: 1, DUO: 2, TRIO: 3, SQUAD: 4 };
const riskLabels = { LOW: "RISQUE FAIBLE", MEDIUM: "RISQUE MOYEN", HIGH: "RISQUE ÉLEVÉ" };
const spawnActions = [
  { type: "FIGHT", label: "Prendre le fight au spawn", description: "Combattre les équipes qui atterrissent ici.", risk: "HIGH" },
  { type: "LOOT", label: "Loot librement", description: "Récupérer du stuff en évitant l'engagement direct.", risk: "MEDIUM" },
  { type: "ROTATE", label: "Changer de zone", description: "Quitter le spot et rejoindre un autre lieu.", risk: "LOW" }
];
const zoneActions = [
  { type: "FIGHT", label: "Prendre un fight", description: "Chercher une équipe adverse et tenter de l'éliminer.", risk: "HIGH" },
  { type: "REFRESH", label: "Refresh matériaux", description: "Récolter du bois, de la pierre et du métal.", risk: "LOW" },
  { type: "ROTATE", label: "Se déplacer", description: "Rejoindre un autre point de la carte.", risk: "MEDIUM" },
  { type: "HEAL", label: "Se soigner", description: "Utiliser les consommables pour récupérer vie et bouclier.", risk: "LOW" },
  { type: "HOLD_POSITION", label: "Jouer la position", description: "Dépenser des matériaux pour sécuriser une construction.", risk: "MEDIUM" },
  { type: "LOOT", label: "Continuer à looter", description: "Chercher armes, soins et munitions.", risk: "MEDIUM" }
];
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function showToast(message) { $("toast").textContent = message; $("toast").classList.remove("hidden"); setTimeout(() => $("toast").classList.add("hidden"), 3200); }
function updateRatingFields() {
  const count = modes[$("mode").value];
  $("ratings-fields").innerHTML = Array.from({ length: count }, (_, i) => `<label><span class="hidden">Note joueur ${i + 1}</span><input class="rating-input" type="number" min="0" max="100" value="${i === 0 ? 78 : 72}" aria-label="Note joueur ${i + 1}" data-rating></label>`).join("");
  updateRolePreview();
}
function updateRolePreview() {
  const count = modes[$("mode").value];
  const roles = [
    ["IGL", "Planifie les rotations : réduit le risque d'embuscade et améliore les décisions de combat."],
    ["FRAGGER", "Augmente les chances de gagner les fights et les dégâts infligés."],
    ["SUPPORT", "Renforce les soins, les réanimations et limite les pertes en combat."],
    ["SCOUT", "Améliore la qualité du loot et réduit les risques lors des déplacements."],
  ].slice(0, count);
  $("role-impact-preview").innerHTML = '<div class="role-preview-heading">RÔLES DE TON ÉQUIPE <span>' + count + ' joueur(s)</span></div><div class="role-preview-grid">' + roles.map(([role, description], index) => '<div class="role-preview-card"><b>' + role + ' · Joueur ' + (index + 1) + '</b><span>' + description + '</span></div>').join("") + '</div>';
  updateStrategyPreview();
}
function updateStrategyPreview() {
  const descriptions = {
    PRUDENT: "Privilégie les rotations sûres et la survie. Les combats sont moins favorables, mais les déplacements sont plus sécurisés.",
    AGGRESSIVE: "Augmente les chances de réussite et les dégâts en combat, au prix de rotations plus risquées.",
    STRATEGIC: "Approche équilibrée : petit bonus en combat et rotations mieux maîtrisées.",
    OPPORTUNISTIC: "Devient plus dangereux contre les équipes affaiblies : bonus de réussite et de dégâts sur les cibles vulnérables."
  };
  const strategy = $("team-strategy").value;
  $("strategy-impact").innerHTML = '<b>IMPACT DE LA STRATÉGIE</b><span>' + descriptions[strategy] + '</span>';
}
function fillLocations(locations) {
  $("drop-location").innerHTML = locations.map(l => `<option value="${l.id}">${escapeHtml(l.name)} · Danger ${l.danger}/100</option>`).join("");
  $("rotation-location").innerHTML = locations.map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join("");
  $("drop-location").value = selectedDrop;
  $("setup-poi-layer").innerHTML = locations.map(l => `<button class="setup-poi ${l.id === $("drop-location").value ? "selected" : ""}" style="left:${l.x / 10000 * 100}%;top:${l.y / 10000 * 100}%" data-setup-poi="${l.id}" title="Loot ${l.lootQuality}/100 · Danger ${l.danger}/100">${escapeHtml(l.name)}</button>`).join("");
  document.querySelectorAll("[data-setup-poi]").forEach(button => button.addEventListener("click", () => {
    $("drop-location").value = button.dataset.setupPoi;
    document.querySelectorAll("[data-setup-poi]").forEach(poi => poi.classList.toggle("selected", poi.dataset.setupPoi === button.dataset.setupPoi));
  }));
  $("drop-location").addEventListener("change", () => document.querySelectorAll("[data-setup-poi]").forEach(poi => poi.classList.toggle("selected", poi.dataset.setupPoi === $("drop-location").value)));
}
function startMatch() {
  const ratings = [...document.querySelectorAll("[data-rating]")].map(input => Math.max(0, Math.min(100, Number(input.value) || 0)));
  socket.emit("battle:create", { seed: Number($("seed").value) || Date.now(), mode: $("mode").value, dropLocationId: $("drop-location").value, playerRatings: ratings, strategy: $("team-strategy").value });
}
function sendSpawnAction(type) {
  const payload = { matchId: currentMatch.id, action: type };
  if (type === "ROTATE") payload.locationId = $("rotation-location").value;
  socket.emit("battle:drop", payload);
}
function sendZoneAction(type, extra = {}) {
  const action = { type, ...extra };
  if (type === "ROTATE" || type === "FIGHT_THEN_ROTATE") action.locationId = $("rotation-location").value;
  socket.emit("battle:action", { matchId: currentMatch.id, action });
}
function renderMap(match) {
  const width = match.map.width, height = match.map.height;
  const storm = match.storm;
  const diameter = storm.radius * 2 / width * 100;
  const circleStyle = "width:" + diameter + "%;height:" + diameter + "%;left:" + (storm.x / width * 100 - diameter / 2) + "%;top:" + (storm.y / height * 100 - diameter / 2) + "%;";
  $("storm-circle").style.cssText = circleStyle;
  const nextCircle = $("next-storm-circle");
  const target = match.stormTarget || storm;
  if (match.stage !== "FINISHED") {
    const nextDiameter = target.radius * 2 / width * 100;
    nextCircle.style.cssText = "width:" + nextDiameter + "%;height:" + nextDiameter + "%;left:" + (target.x / width * 100 - nextDiameter / 2) + "%;top:" + (target.y / height * 100 - nextDiameter / 2) + "%;";
    nextCircle.classList.remove("hidden");
  } else nextCircle.classList.add("hidden");
  const supplyLocations = new Set((match.lootOnGround || []).filter(drop => drop.isSupplyDrop).map(drop => drop.locationId));
  const poiButtons = match.map.locations.map(location => {
    const isUser = location.id === match.currentLocationId;
    const supplyTag = supplyLocations.has(location.id) ? " · 📦" : "";
    return `<button class="poi ${isUser ? "user-location" : ""} ${location.id === match.selectedDropId ? "selected" : ""}" style="left:${location.x / width * 100}%;top:${location.y / height * 100}%" data-poi="${location.id}" title="Loot ${location.lootQuality}/100 · Danger ${location.danger}/100">${escapeHtml(location.name)}${supplyTag}</button>`;
  }).join("");
  $("poi-layer").innerHTML = poiButtons;
  const markerLayer = $("team-marker-layer");
  const existingMarkers = new Map([...markerLayer.querySelectorAll("[data-team-marker]")].map(marker => [marker.dataset.teamMarker, marker]));
  for (const team of match.teams.filter(candidate => candidate.alive)) {
    const alive = team.players.filter(player => player.alive).length;
    let marker = existingMarkers.get(team.id);
    if (!marker) {
      marker = document.createElement("span");
      marker.dataset.teamMarker = team.id;
      markerLayer.appendChild(marker);
    }
    marker.className = "team-marker " + (team.isUser ? "user" : "opponent");
    marker.style.left = (team.position.x / width * 100) + "%";
    marker.style.top = (team.position.y / height * 100) + "%";
    marker.textContent = team.isUser ? "V" : String(alive);
    marker.title = team.name + " · " + alive + " joueur(s) vivant(s)";
    existingMarkers.delete(team.id);
  }
  for (const marker of existingMarkers.values()) marker.remove();
  document.querySelectorAll("[data-poi]").forEach(button => button.addEventListener("click", () => {
    if (match.stage === "DROP") {
      $("drop-location").value = button.dataset.poi;
      showToast("Point de drop sélectionné : " + match.map.locations.find(l => l.id === button.dataset.poi).name);
    } else {
      $("rotation-location").value = button.dataset.poi;
    }
  }));
  $("zone-label").textContent = match.stage === "FINISHED" ? "PARTIE TERMINÉE" : `ZONE ${Math.min(match.phaseIndex + 1, match.phases.length)} · RAYON ${Math.round(storm.radius)}`;
}
function estimateTeamPower(team, style) {
  const players = team.players.filter(p => p.alive && !p.knocked);
  if (!players.length) return 0;
  const skill = players.reduce((sum, p) => sum + (p.skills.overall * .25 + p.skills.aim * .18 + p.skills.building * .18 + p.skills.gameSense * .16 + p.skills.positioning * .12 + p.skills.teamwork * .11), 0) / players.length;
  const weapon = team.inventory.weapons.length ? team.inventory.weapons.reduce((sum, w) => sum + w.damage, 0) / team.inventory.weapons.length / 1.2 : 15;
  const gear = Math.max(10, Math.min(100, weapon));
  const health = players.reduce((sum, p) => sum + p.health + p.shield * .6, 0) / players.length / 2;
  const buildBonus = Math.min(12, team.builds * 1.5) + Math.min(10, (team.resources.wood + team.resources.stone + team.resources.metal) / 100);
  const weights = style === "HEIGHT" ? {ASSAULT_RIFLE:1.25,SNIPER:1.5,SHOTGUN:.55,SMG:.65,PISTOL:.7} : style === "MID" ? {ASSAULT_RIFLE:1,SNIPER:.55,SHOTGUN:1.5,SMG:1,PISTOL:.75} : style === "LOW" ? {ASSAULT_RIFLE:.8,SNIPER:.45,SHOTGUN:1.15,SMG:1.5,PISTOL:.9} : {ASSAULT_RIFLE:1.1,SNIPER:1.35,SHOTGUN:.65,SMG:.85,PISTOL:.75};
  const scores = style ? team.inventory.weapons.map(w => Math.min(100,w.damage/1.2)*weights[w.category]).sort((a,b)=>b-a).slice(0,3) : [];
  const utility = team.inventory.items.filter(i => i.kind === "UTILITY").reduce((n,i) => n + i.quantity, 0);
  const weaponBonus = scores.length ? Math.min(15,scores.reduce((a,b)=>a+b,0)/scores.length*.12 + (style === "OUTSIDE" ? Math.min(5,utility*1.5) : 0)) : 0;
  return skill * .65 + gear * .2 + health * .1 + buildBonus * .05 + weaponBonus;
}
function fightPreview(match, style, actionType) {
  const enemies = match.teams.filter(t => !t.isUser && t.alive && (match.stage !== "DROP" || t.dropLocationId === match.selectedDropId));
  if (!enemies.length) return { chance: 100, enemy: "Aucun adversaire sur ce spot" };
  const sameSpot = enemies.filter(t => t.dropLocationId === match.currentLocationId);
  const pool = sameSpot.length ? sameSpot : enemies;
  pool.sort((a,b) => Math.hypot(a.position.x-match.userTeam.position.x,a.position.y-match.userTeam.position.y)-Math.hypot(b.position.x-match.userTeam.position.x,b.position.y-match.userTeam.position.y));
  const enemy = pool[0];
  const positioning = style === "HEIGHT" ? 7 : style === "MID" ? 3 : style === "LOW" ? 1 : style === "OUTSIDE" ? -2 : 0;
  const builds = Math.min(8, match.userTeam.resources.wood / 80 + match.userTeam.resources.stone / 100);
  const focusBonus = actionType === "FOCUS_FIRE" ? 7 : 0;
  const boxBonus = actionType === "BOXFIGHT" ? (match.userTeam.players.filter(player => player.alive && !player.knocked).reduce((sum, player) => sum + player.skills.building, 0) / Math.max(1, match.userTeam.players.filter(player => player.alive && !player.knocked).length)) * .06 + (match.userTeam.inventory.weapons.some(weapon => weapon.category === "SHOTGUN") ? 5 : -2) : 0;
  const chance = Math.max(5, Math.min(95, 50 + (estimateTeamPower(match.userTeam, style) - estimateTeamPower(enemy)) * .72 + positioning + builds + focusBonus + boxBonus));
  return { chance: Math.round(chance), enemy: enemy.name };
}
function actionsForZone(match) {
  let actions;
  if (match.phaseIndex === 1) actions = [
    {type:"LOOT",label:"Explorer le spot et ouvrir les coffres",description:"Récupérer armes, soins, munitions et matériaux selon la qualité du lieu.",risk:"LOW"},
    {type:"FIGHT",label:"Prendre un fight",description:"Engager une équipe contestataire.",risk:"HIGH"},
    {type:"FARM_FULL",label:"Farm complet · 500/500",description:"Récolter 500 bois, pierre et métal.",risk:"LOW"},
    {type:"FARM_HALF_ROTATE",label:"Farm à moitié puis rotate",description:"Atteindre 250 de chaque matériau puis partir.",risk:"LOW"},
    {type:"FARM_SURGE",label:"Prendre des tags pour la surge",description:"Infliger des dégâts pour augmenter le score de surge.",risk:"MEDIUM"}
  ];
  else if (match.phaseIndex === 2) actions = [
    {type:"ROTATE",label:"Rotation sécurisée",description:"Rejoindre le prochain cercle.",risk:"LOW"},
    {type:"FIGHT_THEN_ROTATE",label:"Fight puis rotation",description:"Prendre un combat avant de partir.",risk:"HIGH"},
    {type:"DISENGAGE",label:"Éviter le combat et se replacer",description:"Privilégier un trajet moins dangereux vers la zone.",risk:"LOW"},
    {type:"FARM_SURGE",label:"Farmer la surge",description:"Prendre des tags pour atteindre le seuil.",risk:"MEDIUM"}
  ];
  else if (match.phaseIndex === 3) actions = [
    {type:"FOCUS_FIRE",label:"Focus une équipe",description:"Concentrer les tirs sur une cible prioritaire : le travail d'équipe et la visée comptent.",risk:"HIGH"},
    {type:"FIGHT",label:"Prendre un fight sur la rotation",description:"Comparer les notes, les PV, les boucliers et l'équipement adverse.",risk:"HIGH"},
    {type:"ROTATE",label:"Avancer vers la prochaine zone",description:"Prendre de l'avance sur la tempête.",risk:"MEDIUM"},
    {type:"REFRESH",label:"Refresh matériaux",description:"Compléter progressivement les ressources.",risk:"LOW"},
    {type:"FARM_SURGE",label:"Farmer la surge",description:"Infliger les dégâts manquants aux adversaires.",risk:"MEDIUM"}
  ];
  else if (match.phaseIndex === 4 || match.phaseIndex === 5) actions = [
    {type:"FOCUS_FIRE",label:"Focus une équipe",description:"Chercher une élimination rapide avant que les équipes se regroupent.",risk:"HIGH"},
    {type:"BOXFIGHT",label:"Prendre un boxfight",description:"Le build, le placement et les pompes influencent le combat rapproché.",risk:"HIGH"},
    {type:"ROTATE",label:"Prendre une bonne position",description:"Rejoindre le prochain cercle et sécuriser une position jouable.",risk:"MEDIUM"},
    {type:"DISENGAGE",label:"Se désengager",description:"Quitter un combat défavorable pour survivre.",risk:"LOW"},
    {type:"REFRESH",label:"Refresh matériaux",description:"Compléter les ressources avant le dernier cercle.",risk:"LOW"}
  ];
  else actions = [
    {type:"FIGHT_HEIGHT",label:"Prendre la hauteur",description:"Synergie renforcée avec fusils d’assaut et snipers.",risk:"HIGH",style:"HEIGHT"},
    {type:"FIGHT_MID",label:"Jouer au milieu",description:"Synergie renforcée avec les pompes.",risk:"HIGH",style:"MID"},
    {type:"FIGHT_LOW",label:"Jouer en bas",description:"Synergie renforcée avec les SMG et pompes.",risk:"HIGH",style:"LOW"},
    {type:"FIGHT_OUTSIDE",label:"Jouer extérieur",description:"Synergie avec les armes à distance et objets utilitaires.",risk:"HIGH",style:"OUTSIDE"}
  ];
  if (match.phaseIndex < 6 && match.userTeam.rebootTokens > 0 && match.userTeam.players.some(p=>!p.alive&&!p.rebooted) && match.userTeam.players.some(p=>p.alive&&!p.knocked)) actions.unshift({type:"REBOOT",label:"Reboot un mate éliminé",description:"Faire revenir un joueur avec 100 PV grâce à un jeton de reboot.",risk:"MEDIUM"});
  if (match.phaseIndex < 6 && match.userTeam.players.some(p=>p.alive&&p.knocked) && match.userTeam.players.some(p=>p.alive&&!p.knocked)) actions.unshift({type:"REVIVE",label:"Réanimer un équipier",description:"Le mate revient avec 30 PV.",risk:"MEDIUM"});
  if (match.phaseIndex < 6 && match.userTeam.inventory.items.some(item=>item.kind==="HEAL"&&item.quantity>0) && match.userTeam.players.some(p=>p.alive&&!p.knocked&&(p.health<100||p.shield<100))) actions.unshift({type:"HEAL",label:"Utiliser un soin",description:"Soigner le joueur le plus affaibli avec un consommable disponible.",risk:"LOW"});
  if (match.phaseIndex >= 3 && match.phaseIndex < 6) actions.push({type:"HOLD_POSITION",label:"Construire une position défensive",description:"Dépenser 10 matériaux pour sécuriser temporairement la position.",risk:"LOW"});
  return actions;
}
function renderActions(match) {
  const actions = match.stage === "DROP" ? spawnActions : actionsForZone(match);
  const zoneNumber = match.stage === "DROP" ? 1 : Math.min(7, match.phaseIndex + 1);
  $("decision-title").textContent = match.stage === "FINISHED" ? (match.result === "WIN" ? "VICTORY ROYALE !" : "ÉQUIPE ÉLIMINÉE") : match.stage === "DROP" ? "Zone 1 · Choisis ton spawn" : "Zone " + zoneNumber + " · " + match.map.locations.find(l => l.id === match.currentLocationId).name;
  $("decision-description").textContent = match.stage === "DROP" ? "Si ton spot est contesté, le pourcentage estime tes chances selon la force de l’équipe adverse." : match.stage === "FINISHED" ? "Classement final : #" + match.finalPlacement + " · " + match.userTeam.eliminations + " élimination(s)." : zoneNumber === 2 ? "Fight ou farm de matériaux : les ressources sont plafonnées à 500 chacune." : zoneNumber === 3 ? "Choisis de rotate immédiatement ou de prendre un fight avant la rotation." : zoneNumber === 4 ? "Fight, avance vers la zone ou complète tes matériaux." : zoneNumber === 5 || zoneNumber === 6 ? "Prépare le dernier cercle : choisis entre fight, rotation et refresh." : "Dernier cercle : choisis ta stratégie, hauteur, milieu, bas ou extérieur.";
  if (match.stage === "FINISHED") { $("action-list").innerHTML = ""; return; }
  const hasFocusAction = actions.some(action => action.type === "FOCUS_FIRE");
  let focusTargetPicker = "";
  if (hasFocusAction) {
    const enemies = match.teams.filter(team => !team.isUser && team.alive);
    const samePoi = enemies.filter(team => team.dropLocationId === match.currentLocationId);
    const pool = (samePoi.length ? samePoi : enemies).sort((a, b) => Math.hypot(a.position.x - match.userTeam.position.x, a.position.y - match.userTeam.position.y) - Math.hypot(b.position.x - match.userTeam.position.x, b.position.y - match.userTeam.position.y));
    const targetTeam = pool[0];
    const targets = targetTeam ? targetTeam.players.filter(player => player.alive && !player.knocked) : [];
    if (targetTeam && targets.length) {
      targets.sort((a, b) => (a.health + a.shield) - (b.health + b.shield));
      focusTargetPicker = '<label class="focus-target-picker">Cible prioritaire · ' + escapeHtml(targetTeam.name) + '<select id="focus-target">' + targets.map(player => '<option value="' + player.id + '">' + escapeHtml(player.name) + ' · ' + (player.health + player.shield) + ' PV/bouclier</option>').join("") + '</select></label>';
    }
  }
  $("action-list").innerHTML = focusTargetPicker + actions.map(a => {
    const style = a.style || (a.type === "FIGHT_HEIGHT" ? "HEIGHT" : a.type === "FIGHT_MID" ? "MID" : a.type === "FIGHT_LOW" ? "LOW" : a.type === "FIGHT_OUTSIDE" ? "OUTSIDE" : undefined);
    const isFight = ["FIGHT","FIGHT_THEN_ROTATE","FIGHT_HEIGHT","FIGHT_MID","FIGHT_LOW","FIGHT_OUTSIDE","FOCUS_FIRE","BOXFIGHT"].includes(a.type);
    const preview = isFight ? fightPreview(match, style, a.type) : null;
    const isSurge = a.type === "FARM_SURGE";
    const surgeProgress = Math.min(100, Math.round((match.userTeam.damageDealt || 0) / Math.max(1, match.surgeThreshold || 1) * 100));
    const badge = preview ? '<span class="fight-odds"><b>' + preview.chance + '%</b><small>chance estimée</small></span>' : isSurge ? '<span class="fight-odds"><b>' + surgeProgress + '%</b><small>seuil surge</small></span>' : '<span class="risk ' + a.risk + '">' + riskLabels[a.risk] + '</span>';
    const details = preview ? '<span class="odds-track"><i style="width:' + preview.chance + '%"></i></span><small>Adversaire : ' + escapeHtml(preview.enemy) + '</small>' : isSurge ? '<span class="odds-track"><i style="width:' + surgeProgress + '%"></i></span><small>Dégâts : ' + (match.userTeam.damageDealt || 0) + ' / ' + (match.surgeThreshold || 0) + '</small>' : '';
    return '<button class="action-button" data-action="' + a.type + '"><span><b>' + a.label + '</b><small>' + a.description + '</small>' + details + '</span>' + badge + '</button>';
  }).join("");
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    if (match.stage === "DROP") return sendSpawnAction(button.dataset.action);
    const extra = button.dataset.action === "FOCUS_FIRE" && $("focus-target") ? { targetPlayerId: $("focus-target").value } : {};
    sendZoneAction(button.dataset.action, extra);
  }));
  $("rotation-picker").classList.toggle("hidden", match.stage === "DROP" || !actions.some(a => a.type === "ROTATE" || a.type === "FIGHT_THEN_ROTATE"));
}
function equipmentIcon(id) {
  const safeId = /^[a-z0-9-]+$/.test(id || "") ? id : "ammo";
  return '<svg class="equipment-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="/assets/equipment.svg#' + safeId + '"></use></svg>';
}
function renderTeam(team) {
  const teamDamage = team.players.reduce((sum, player) => sum + (player.damageDealt || 0), 0);
  const teamEliminations = team.players.reduce((sum, player) => sum + (player.eliminations || 0), 0);
  const combatSummary = '<div class="team-combat-summary"><span>Dégâts totaux</span><b>' + teamDamage + '</b><span>Éliminations individuelles</span><b>' + teamEliminations + '</b></div>';
  $("team-list").innerHTML = combatSummary + team.players.map(player => {
    const status = !player.alive ? "· ÉLIMINÉ" : player.knocked ? "· À TERRE" : "";
    const roleImpact = { IGL: "Rotations plus sûres · lecture tactique", FRAGGER: "Bonus de combat · dégâts augmentés", SUPPORT: "Soins et réanimations améliorés", SCOUT: "Loot amélioré · détection des risques" }[player.role];
    return '<div class="team-player"><div><div class="player-name">' + escapeHtml(player.name) + ' · ' + player.role + ' · ' + player.eliminations + ' kill(s) · ' + player.damageDealt + ' dégâts ' + status + '</div><div class="role-impact-line">' + roleImpact + '</div><div class="health-line"><div class="health-fill ' + (player.knocked ? "downed" : "") + '" style="width:' + player.health + '%"></div></div></div><div class="player-rating">' + player.skills.overall + '</div></div>';
  }).join("");
  const rebootInfo = $("reboot-info");
  if (rebootInfo && currentMatch) rebootInfo.textContent = "Jetons de reboot : " + team.rebootTokens + " · Un mate éliminé peut revenir avant la zone finale.";
  $("wood").textContent = team.resources.wood;
  $("stone").textContent = team.resources.stone;
  $("metal").textContent = team.resources.metal;
  $("wood-bar").style.width = (team.resources.wood / 500 * 100) + "%";
  $("stone-bar").style.width = (team.resources.stone / 500 * 100) + "%";
  $("metal-bar").style.width = (team.resources.metal / 500 * 100) + "%";
  $("inventory-list").innerHTML = Array.from({ length: 5 }, (_, i) => {
    const weapon = team.inventory.weapons[i];
    return '<div class="inventory-slot"><span class="gear-name">' + (weapon ? equipmentIcon(weapon.definitionId) : equipmentIcon("empty-slot")) + '<span>' + (weapon ? escapeHtml(weapon.name) : "Slot vide") + '</span></span><b class="' + (weapon ? "rarity-" + weapon.rarity : "") + '">' + (weapon ? weapon.rarity : "—") + '</b></div>';
  }).join("");
  $("consumables-list").innerHTML = team.inventory.items.length ? team.inventory.items.map(item => '<div class="consumable-item">' + equipmentIcon(item.definitionId) + '<span>' + escapeHtml(item.name) + ' <b>×' + item.quantity + '</b></span><small class="rarity-' + item.rarity + '">' + item.rarity + '</small></div>').join("") : "Aucun consommable";
  const groundLoot = $("ground-loot");
  if (groundLoot) {
    groundLoot.innerHTML = currentMatch && currentMatch.lootOnGround.filter(drop => !drop.locationId || drop.locationId === currentMatch.currentLocationId).length
      ? currentMatch.lootOnGround.filter(drop => !drop.locationId || drop.locationId === currentMatch.currentLocationId).slice(0,12).map(drop => {
        const buttons = drop.kind === "WEAPON" && team.inventory.weapons.length >= team.inventory.maxWeaponSlots
          ? team.inventory.weapons.map(item => '<button class="loot-pickup" data-pickup="' + drop.id + '" data-replace-weapon="' + item.id + '">Remplacer ' + escapeHtml(item.name) + '</button>').join("")
          : '<button class="loot-pickup" data-pickup="' + drop.id + '">Ramasser</button>';
        return '<div class="ground-loot-row"><span>' + escapeHtml(drop.name) + ' ×' + drop.quantity + (drop.isSupplyDrop ? ' · 📦 RAVITAILLEMENT' : '') + ' <small class="rarity-' + drop.rarity + '">' + drop.rarity + '</small></span><div>' + buttons + '</div></div>';
      }).join("")
      : '<p class="empty-feed">Aucun objet au sol à proximité.</p>';
    groundLoot.querySelectorAll("[data-pickup]").forEach(button => button.addEventListener("click", () => sendZoneAction("PICKUP_LOOT", {dropId:button.dataset.pickup,replaceWeaponId:button.dataset.replaceWeapon||undefined})));
  }
}
function renderEvents(events) {
  $("event-log").innerHTML = events.slice(0, 8).map(item => `<div class="event-row"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description)}</p></div>`).join("");
  const eliminations = events.filter(item => item.type === "ELIMINATION").slice(0, 20);
  $("elimination-feed").innerHTML = eliminations.length
    ? eliminations.map(item => `<div class="elimination-row"><b>${escapeHtml(item.description)}</b><small>Zone ${Math.min(7, item.phase + 1)} · ${new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div>`).join("")
    : '<p class="empty-feed">Aucune élimination pour le moment. Les affrontements entre équipes apparaîtront ici.</p>';
}
function readFncsSeries() {
  try { return JSON.parse(localStorage.getItem("fortnite-manager-fncs-series") || '{"number":1,"results":[]}'); }
  catch { return {number:1,results:[]}; }
}
function renderFncsSeries(match) {
  const series = readFncsSeries();
  if (match.stage === "FINISHED" && !series.results.some(result => result.id === match.id)) {
    if (series.results.length >= 6) { series.number += 1; series.results = []; }
    series.results.push({id:match.id,points:match.totalPoints,placement:match.finalPlacement,kills:match.userTeam.eliminations});
    try { localStorage.setItem("fortnite-manager-fncs-series", JSON.stringify(series)); } catch {}
  }
  const points = series.results.reduce((sum,result)=>sum+result.points,0);
  const best = series.results.length ? Math.min(...series.results.map(result=>result.placement)) : "—";
  const target = $("series-info");
  if (target) target.innerHTML = '<div class="location-stat"><span>Série FNCS</span><b>#' + series.number + '</b></div><div class="location-stat"><span>Parties jouées</span><b>' + series.results.length + '/6</b></div><div class="location-stat"><span>Total de points</span><b>' + points + ' pts</b></div><div class="location-stat"><span>Meilleur placement</span><b>#' + best + '</b></div><div class="series-results">' + (series.results.length ? series.results.map((result,index)=>'<span>Game ' + (index+1) + ' · #' + result.placement + ' · ' + result.points + ' pts</span>').join('') : '<small>Aucune partie terminée dans cette série.</small>') + '</div>';
}
function renderMatch(match) {
  currentMatch = match;
  renderFncsSeries(match);
  $("setup-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
  $("phase-title").textContent = match.stage === "FINISHED" ? (match.result === "WIN" ? "VICTORY ROYALE" : "ÉLIMINATION") : match.stage === "DROP" ? "Zone 1 · Choisis ton spawn" : "Zone " + Math.min(7, match.phaseIndex + 1);
  $("phase-subtitle").textContent = match.stage === "FINISHED" ? `Tu termines #${match.finalPlacement} · ${match.userTeam.eliminations} élimination(s) · ${match.totalPoints} points compétitifs.` : `Drop : ${match.map.locations.find(l => l.id === match.selectedDropId).name} · Position : ${match.map.locations.find(l => l.id === match.currentLocationId).name} · Temps de jeu : ${Math.floor((match.gameTimeSeconds || 0) / 60)}:${String((match.gameTimeSeconds || 0) % 60).padStart(2,"0")}`;
  $("teams-left").textContent = match.teamsRemaining;
  $("players-left").textContent = match.playersRemaining;
  $("kills-left").textContent = match.userTeam.eliminations;
  $("points-left").textContent = match.totalPoints;
  $("phase-number").textContent = match.stage === "DROP" ? "1/7" : match.stage === "FINISHED" ? "FIN" : Math.min(7, match.phaseIndex + 1) + "/7";
  renderMap(match);
  renderActions(match);
  renderTeam(match.userTeam);
  renderEvents(match.events);
  const location = match.map.locations.find(l => l.id === match.currentLocationId);
  $("location-info").innerHTML = `<div class="location-stat"><span>Stratégie IGL</span><b>${({PRUDENT:"Prudent",AGGRESSIVE:"Agressif",STRATEGIC:"Stratégique",OPPORTUNISTIC:"Opportuniste"})[match.userTeam.strategy]}</b></div><div class="location-stat"><span>Score compétitif</span><b>${match.totalPoints} pts</b></div><div class="location-stat"><span>Position actuelle</span><b>${escapeHtml(location.name)}</b></div><div class="location-stat"><span>Qualité du loot</span><b>${location.lootQuality}/100</b></div><div class="location-stat"><span>Danger local</span><b>${location.danger}/100</b></div><div class="location-stat"><span>Équipes restantes</span><b>${match.teamsRemaining}</b></div>`;
  const surgePercent = Math.min(100, Math.round((match.userTeam.damageDealt || 0) / Math.max(1, match.surgeThreshold || 1) * 100));
  const surgeStatus = match.stormSurgeActive ? "ACTIVE · dégâts toutes les 5 s" : match.phaseIndex >= 3 ? "SEUIL ATTEINT" : "PAS ENCORE ACTIVE";
  const secondsLeft = Math.max(0, match.secondsUntilShrink || 0);
  const activePhase = match.phases[Math.max(0, Math.min(match.phaseIndex - 1, match.phases.length - 1))];
  $("surge-info").innerHTML = `<div class="location-stat"><span>Storm surge</span><b class="${match.stormSurgeActive ? "surge-danger" : ""}">${surgeStatus}</b></div><div class="surge-track"><i style="width:${surgePercent}%"></i></div><div class="location-stat"><span>Dégâts infligés / seuil</span><b>${match.userTeam.damageDealt || 0} / ${match.surgeThreshold || 0}</b></div><div class="location-stat"><span>DPS tempête hors zone</span><b>${activePhase.damagePerSecond} / seconde</b></div><div class="location-stat"><span>Pulse storm surge</span><b>25 dégâts / 5 s de jeu</b></div><div class="location-stat"><span>Horloge de simulation</span><b>5 s de jeu / 1 s réelle</b></div><div class="location-stat"><span>Dégâts tempête subis</span><b>${match.stormDamageTaken || 0}</b></div><div class="location-stat"><span>Dégâts surge subis</span><b>${match.surgeDamageTaken || 0}</b></div><div class="location-stat"><span>Avant fermeture (temps de jeu)</span><b>${secondsLeft > 0 ? secondsLeft + " s" : "Fermeture en cours"}</b></div>`;
}
socket.on("connect", () => { $("connection-dot").parentElement.classList.add("online"); $("connection-label").textContent = "Serveur connecté"; });
socket.on("disconnect", () => { $("connection-dot").parentElement.classList.remove("online"); $("connection-label").textContent = "Déconnecté"; });
socket.on("battle:state", renderMatch);
socket.on("battle:error", payload => showToast(payload.message || "Une erreur est survenue."));
$("mode").addEventListener("change", updateRatingFields);
$("start-button").addEventListener("click", startMatch);
$("new-match").addEventListener("click", () => { currentMatch = null; $("game-panel").classList.add("hidden"); $("setup-panel").classList.remove("hidden"); });
updateRatingFields();
fetch("/api/map").then(r => r.json()).then(data => fillLocations(data.locations)).catch(() => {});
