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
  socket.emit("battle:create", { seed: Number($("seed").value) || Date.now(), mode: $("mode").value, dropLocationId: $("drop-location").value, playerRatings: ratings });
}
function sendSpawnAction(type) {
  const payload = { matchId: currentMatch.id, action: type };
  if (type === "ROTATE") payload.locationId = $("rotation-location").value;
  socket.emit("battle:drop", payload);
}
function sendZoneAction(type) {
  const action = { type };
  if (type === "ROTATE" || type === "FIGHT_THEN_ROTATE") action.locationId = $("rotation-location").value;
  if (type === "HEAL") {
    const heal = currentMatch.userTeam.inventory.items.find(item => item.kind === "HEAL");
    if (heal) action.itemDefinitionId = heal.definitionId;
  }
  socket.emit("battle:action", { matchId: currentMatch.id, action });
}
function renderMap(match) {
  const width = match.map.width, height = match.map.height;
  const storm = match.storm;
  const diameter = storm.radius * 2 / width * 100;
  const circleStyle = "width:" + diameter + "%;height:" + diameter + "%;left:" + (storm.x / width * 100 - diameter / 2) + "%;top:" + (storm.y / height * 100 - diameter / 2) + "%;";
  $("storm-circle").style.cssText = circleStyle;
  const nextPhase = match.stage === "DROP" ? match.phases[0] : match.phases[match.phaseIndex];
  const nextCircle = $("next-storm-circle");
  if (nextPhase && match.stage !== "FINISHED") {
    const nextDiameter = nextPhase.radius * 2 / width * 100;
    nextCircle.style.cssText = "width:" + nextDiameter + "%;height:" + nextDiameter + "%;left:" + (storm.x / width * 100 - nextDiameter / 2) + "%;top:" + (storm.y / height * 100 - nextDiameter / 2) + "%;";
    nextCircle.classList.remove("hidden");
  } else nextCircle.classList.add("hidden");
  const poiButtons = match.map.locations.map(location => {
    const isUser = location.id === match.currentLocationId;
    return `<button class="poi ${isUser ? "user-location" : ""} ${location.id === match.selectedDropId ? "selected" : ""}" style="left:${location.x / width * 100}%;top:${location.y / height * 100}%" data-poi="${location.id}" title="Loot ${location.lootQuality}/100 · Danger ${location.danger}/100">${escapeHtml(location.name)}</button>`;
  }).join("");
  const teamMarkers = match.teams.filter(team => team.alive).map(team => {
    const alive = team.players.filter(player => player.alive).length;
    const label = team.isUser ? "V" : String(alive);
    return `<span class="team-marker ${team.isUser ? "user" : "opponent"}" style="left:${team.position.x / width * 100}%;top:${team.position.y / height * 100}%" title="${escapeHtml(team.name)} · ${alive} joueur(s) vivant(s)">${label}</span>`;
  }).join("");
  $("poi-layer").innerHTML = poiButtons + teamMarkers;
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
function fightPreview(match, style) {
  const enemies = match.teams.filter(t => !t.isUser && t.alive && (match.stage !== "DROP" || t.dropLocationId === match.selectedDropId));
  if (!enemies.length) return { chance: 100, enemy: "Aucun adversaire sur ce spot" };
  const sameSpot = enemies.filter(t => t.dropLocationId === match.currentLocationId);
  const pool = sameSpot.length ? sameSpot : enemies;
  pool.sort((a,b) => Math.hypot(a.position.x-match.userTeam.position.x,a.position.y-match.userTeam.position.y)-Math.hypot(b.position.x-match.userTeam.position.x,b.position.y-match.userTeam.position.y));
  const enemy = pool[0];
  const positioning = style === "HEIGHT" ? 7 : style === "MID" ? 3 : style === "LOW" ? 1 : style === "OUTSIDE" ? -2 : 0;
  const builds = Math.min(8, match.userTeam.resources.wood / 80 + match.userTeam.resources.stone / 100);
  const chance = Math.max(5, Math.min(95, 50 + (estimateTeamPower(match.userTeam, style) - estimateTeamPower(enemy)) * .72 + positioning + builds));
  return { chance: Math.round(chance), enemy: enemy.name };
}
function actionsForZone(match) {
  let actions;
  if (match.phaseIndex === 1) actions = [{type:"FIGHT",label:"Prendre un fight sur la rotation",description:"Comparer la force, la vie et le stuff des deux équipes.",risk:"HIGH"},{type:"REFRESH",label:"Farmer les matériaux",description:"Récolter bois, pierre et métal (500 maximum chacun).",risk:"LOW"}];
  else if (match.phaseIndex === 2) actions = [{type:"ROTATE",label:"Lancer la rotation maintenant",description:"Rejoindre la prochaine zone avant la tempête.",risk:"LOW"},{type:"FIGHT_THEN_ROTATE",label:"Prendre un fight puis rotate",description:"Engager une équipe avant de rejoindre le prochain cercle.",risk:"HIGH"}];
  else if (match.phaseIndex === 3) actions = [{type:"FIGHT",label:"Prendre un fight sur la rotation",description:"Comparer les notes, les PV, les boucliers et l’équipement adverse.",risk:"HIGH"},{type:"ROTATE",label:"Avancer vers la prochaine zone",description:"Prendre de l’avance sur la tempête.",risk:"MEDIUM"},{type:"REFRESH",label:"Refresh matériaux",description:"Compléter les ressources de l’équipe.",risk:"LOW"}];
  else actions = [{type:"FIGHT_HEIGHT",label:"Prendre la hauteur",description:"Synergie renforcée avec fusils d’assaut et snipers.",risk:"HIGH",style:"HEIGHT"},{type:"FIGHT_MID",label:"Jouer au milieu",description:"Synergie renforcée avec les pompes.",risk:"HIGH",style:"MID"},{type:"FIGHT_LOW",label:"Jouer en bas",description:"Synergie renforcée avec les SMG et pompes.",risk:"HIGH",style:"LOW"},{type:"FIGHT_OUTSIDE",label:"Jouer hors zone",description:"Synergie avec les armes à distance et objets utilitaires.",risk:"HIGH",style:"OUTSIDE"}];
  if (match.userTeam.players.some(p=>p.alive&&p.knocked) && match.userTeam.players.some(p=>p.alive&&!p.knocked)) actions.unshift({type:"REVIVE",label:"Réanimer un équipier",description:"Le mate revient avec 30 PV. Au moins un joueur doit rester actif.",risk:"MEDIUM"});
  return actions;
}
function renderActions(match) {
  const actions = match.stage === "DROP" ? spawnActions : actionsForZone(match);
  const zoneNumber = match.stage === "DROP" ? 1 : Math.min(5, match.phaseIndex + 1);
  $("decision-title").textContent = match.stage === "FINISHED" ? (match.result === "WIN" ? "VICTORY ROYALE !" : "ÉQUIPE ÉLIMINÉE") : match.stage === "DROP" ? "Zone 1 · Choisis ton spawn" : "Zone " + zoneNumber + " · " + match.map.locations.find(l => l.id === match.currentLocationId).name;
  $("decision-description").textContent = match.stage === "DROP" ? "Si ton spot est contesté, le pourcentage estime tes chances selon la force de l’équipe adverse." : match.stage === "FINISHED" ? "Classement final : #" + match.finalPlacement + " · " + match.userTeam.eliminations + " élimination(s)." : zoneNumber === 2 ? "Fight ou farm de matériaux : les ressources sont plafonnées à 500 chacune." : zoneNumber === 3 ? "Choisis de rotate immédiatement ou de prendre un fight avant la rotation." : zoneNumber === 4 ? "Fight, avance vers la zone ou complète tes matériaux." : "Le pourcentage tient compte de ton équipement et de la position choisie.";
  if (match.stage === "FINISHED") { $("action-list").innerHTML = ""; return; }
  $("action-list").innerHTML = actions.map(a => {
    const style = a.style || (a.type === "FIGHT_HEIGHT" ? "HEIGHT" : a.type === "FIGHT_MID" ? "MID" : a.type === "FIGHT_LOW" ? "LOW" : a.type === "FIGHT_OUTSIDE" ? "OUTSIDE" : undefined);
    const isFight = ["FIGHT","FIGHT_THEN_ROTATE","FIGHT_HEIGHT","FIGHT_MID","FIGHT_LOW","FIGHT_OUTSIDE"].includes(a.type);
    const preview = isFight ? fightPreview(match, style) : null;
    const badge = preview ? '<span class="fight-odds"><b>' + preview.chance + '%</b><small>chance estimée</small></span>' : '<span class="risk ' + a.risk + '">' + riskLabels[a.risk] + '</span>';
    const details = preview ? '<span class="odds-track"><i style="width:' + preview.chance + '%"></i></span><small>Adversaire : ' + escapeHtml(preview.enemy) + '</small>' : '';
    return '<button class="action-button" data-action="' + a.type + '"><span><b>' + a.label + '</b><small>' + a.description + '</small>' + details + '</span>' + badge + '</button>';
  }).join("");
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => match.stage === "DROP" ? sendSpawnAction(button.dataset.action) : sendZoneAction(button.dataset.action)));
  $("rotation-picker").classList.toggle("hidden", match.stage === "DROP" || !actions.some(a => a.type === "ROTATE" || a.type === "FIGHT_THEN_ROTATE"));
}
function equipmentIcon(id) {
  const safeId = /^[a-z0-9-]+$/.test(id || "") ? id : "ammo";
  return '<svg class="equipment-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="/assets/equipment.svg#' + safeId + '"></use></svg>';
}
function renderTeam(team) {
  $("team-list").innerHTML = team.players.map(player => {
    const status = !player.alive ? "· ÉLIMINÉ" : player.knocked ? "· À TERRE" : "";
    return '<div class="team-player"><div><div class="player-name">' + escapeHtml(player.name) + ' ' + status + '</div><div class="health-line"><div class="health-fill ' + (player.knocked ? "downed" : "") + '" style="width:' + player.health + '%"></div></div></div><div class="player-rating">' + player.skills.overall + '</div></div>';
  }).join("");
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
}
function renderEvents(events) {
  $("event-log").innerHTML = events.slice(0, 8).map(item => `<div class="event-row"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description)}</p></div>`).join("");
  const eliminations = events.filter(item => item.type === "ELIMINATION").slice(0, 20);
  $("elimination-feed").innerHTML = eliminations.length
    ? eliminations.map(item => `<div class="elimination-row"><b>${escapeHtml(item.description)}</b><small>Zone ${Math.min(5, item.phase + 1)} · ${new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div>`).join("")
    : '<p class="empty-feed">Aucune élimination pour le moment. Les affrontements entre équipes apparaîtront ici.</p>';
}
function renderMatch(match) {
  currentMatch = match;
  $("setup-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
  $("phase-title").textContent = match.stage === "FINISHED" ? (match.result === "WIN" ? "VICTORY ROYALE" : "ÉLIMINATION") : match.stage === "DROP" ? "Zone 1 · Choisis ton spawn" : "Zone " + Math.min(5, match.phaseIndex + 1);
  $("phase-subtitle").textContent = match.stage === "FINISHED" ? `Tu termines #${match.finalPlacement} avec ${match.userTeam.eliminations} élimination(s).` : `Drop : ${match.map.locations.find(l => l.id === match.selectedDropId).name} · Position : ${match.map.locations.find(l => l.id === match.currentLocationId).name}`;
  $("teams-left").textContent = match.teamsRemaining;
  $("players-left").textContent = match.playersRemaining;
  $("phase-number").textContent = match.stage === "DROP" ? "1/5" : match.stage === "FINISHED" ? "FIN" : Math.min(5, match.phaseIndex + 1) + "/5";
  renderMap(match);
  renderActions(match);
  renderTeam(match.userTeam);
  renderEvents(match.events);
  const location = match.map.locations.find(l => l.id === match.currentLocationId);
  $("location-info").innerHTML = `<div class="location-stat"><span>Position actuelle</span><b>${escapeHtml(location.name)}</b></div><div class="location-stat"><span>Qualité du loot</span><b>${location.lootQuality}/100</b></div><div class="location-stat"><span>Danger local</span><b>${location.danger}/100</b></div><div class="location-stat"><span>Équipes restantes</span><b>${match.teamsRemaining}</b></div>`;
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
