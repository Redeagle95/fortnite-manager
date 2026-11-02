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
  if (type === "ROTATE") action.locationId = $("rotation-location").value;
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
  $("storm-circle").style.cssText = `width:${diameter}%;height:${diameter}%;left:${storm.x / width * 100 - diameter / 2}%;top:${storm.y / height * 100 - diameter / 2}%;`;
  $("poi-layer").innerHTML = match.map.locations.map(location => {
    const isUser = location.id === match.currentLocationId;
    return `<button class="poi ${isUser ? "user-location" : ""} ${location.id === match.selectedDropId ? "selected" : ""}" style="left:${location.x / width * 100}%;top:${location.y / height * 100}%" data-poi="${location.id}" title="Loot ${location.lootQuality}/100 · Danger ${location.danger}/100">${escapeHtml(location.name)}</button>`;
  }).join("");
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
function renderActions(match) {
  const actions = match.stage === "DROP" ? spawnActions : zoneActions;
  $("decision-title").textContent = match.stage === "DROP" ? "Tu viens d'atterrir. Que fais-tu ?" : match.stage === "FINISHED" ? (match.result === "WIN" ? "VICTORY ROYALE !" : "ÉQUIPE ÉLIMINÉE") : `Phase ${match.phaseIndex + 1} · Quelle décision ?`;
  $("decision-description").textContent = match.stage === "DROP" ? "Les adversaires présents sur ton spot peuvent contester ton loot." : match.stage === "FINISHED" ? `Classement final : #${match.finalPlacement} · ${match.userTeam.eliminations} élimination(s).` : "Chaque action influence ton équipement, ta position et tes chances de survie.";
  if (match.stage === "FINISHED") { $("action-list").innerHTML = ""; return; }
  $("action-list").innerHTML = actions.map(a => `<button class="action-button" data-action="${a.type}"><span><b>${a.label}</b><small>${a.description}</small></span><span class="risk ${a.risk}">${riskLabels[a.risk]}</span></button>`).join("");
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => match.stage === "DROP" ? sendSpawnAction(button.dataset.action) : sendZoneAction(button.dataset.action)));
  $("rotation-picker").classList.toggle("hidden", match.stage === "DROP" ? false : !actions.some(a => a.type === "ROTATE"));
}
function renderTeam(team) {
  $("team-list").innerHTML = team.players.map(player => `<div class="team-player"><div><div class="player-name">${escapeHtml(player.name)} ${player.alive ? "" : "· ÉLIMINÉ"}</div><div class="health-line"><div class="health-fill" style="width:${player.health}%"></div></div></div><div class="player-rating">${player.skills.overall}</div></div>`).join("");
  $("wood").textContent = team.resources.wood;
  $("stone").textContent = team.resources.stone;
  $("metal").textContent = team.resources.metal;
  $("inventory-list").innerHTML = Array.from({ length: 5 }, (_, i) => {
    const weapon = team.inventory.weapons[i];
    return `<div class="inventory-slot"><span>${weapon ? escapeHtml(weapon.name) : "Slot vide"}</span><b class="${weapon ? "rarity-" + weapon.rarity : ""}">${weapon ? weapon.rarity : "—"}</b></div>`;
  }).join("");
  $("consumables-list").textContent = team.inventory.items.length ? team.inventory.items.map(item => `${item.name} ×${item.quantity}`).join(" · ") : "Aucun consommable";
}
function renderEvents(events) {
  $("event-log").innerHTML = events.slice(0, 8).map(item => `<div class="event-row"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description)}</p></div>`).join("");
}
function renderMatch(match) {
  currentMatch = match;
  $("setup-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
  $("phase-title").textContent = match.stage === "FINISHED" ? (match.result === "WIN" ? "VICTORY ROYALE" : "ÉLIMINATION") : match.stage === "DROP" ? "Choisis ton premier move" : `Zone ${Math.max(1, match.phaseIndex)}`;
  $("phase-subtitle").textContent = match.stage === "FINISHED" ? `Tu termines #${match.finalPlacement} avec ${match.userTeam.eliminations} élimination(s).` : `Drop : ${match.map.locations.find(l => l.id === match.selectedDropId).name} · Position : ${match.map.locations.find(l => l.id === match.currentLocationId).name}`;
  $("teams-left").textContent = match.teamsRemaining;
  $("players-left").textContent = match.playersRemaining;
  $("phase-number").textContent = match.stage === "DROP" ? "DROP" : match.stage === "FINISHED" ? "FIN" : match.phaseIndex + "/" + match.phases.length;
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
