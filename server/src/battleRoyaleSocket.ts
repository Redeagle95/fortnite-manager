import type { Server } from "socket.io";
import {
  advanceBattleBus,
  advanceMatchTime,
  createBattleRoyale,
  jumpBattleBus,
  resolveDrop,
  setBattleBusDestination,
  takeZoneAction,
} from "../../shared/src/battle-royale/engine";
import type { BattleAction, BattleMatch, BattleMode } from "../../shared/src/battle-royale/types";

const matches = new Map<string, BattleMatch>();
const modes: BattleMode[] = ["SOLO", "DUO", "TRIO", "SQUAD"];
const actions = ["FARM_FULL", "FARM_HALF_ROTATE", "FARM_SURGE", "FIGHT", "FIGHT_THEN_ROTATE", "FIGHT_HEIGHT", "FIGHT_MID", "FIGHT_LOW", "FIGHT_OUTSIDE", "LOOT", "REFRESH", "ROTATE", "HEAL", "HOLD_POSITION", "REVIVE", "REBOOT", "FOCUS_FIRE", "BOXFIGHT", "DISENGAGE", "PICKUP_LOOT"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function registerBattleRoyaleSocket(io: Server): void {
  // The bus is paused while the user is aboard. Once the user jumps, the descent
  // and the remaining AI landings progress automatically in real time.
  setInterval(() => {
    for (const match of matches.values()) {
      if (match.stage !== "DROP" || match.bus.status === "COMPLETE") continue;
      const userPlan = match.bus.plans.find(plan => plan.teamId === match.userTeam.id);
      if (!userPlan || userPlan.status === "ON_BUS") continue;
      advanceBattleBus(match, 1);
      io.to(match.id).emit("battle:state", match);
    }
  }, 1000);

  io.on("connection", (socket) => {
    socket.on("battle:create", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Paramètres de partie manquants.");
        const seed = Number(payload.seed);
        const mode = payload.mode;
        const dropLocationId = String(payload.dropLocationId ?? "");
        if (!Number.isInteger(seed)) throw new Error("La seed doit être un entier.");
        if (!modes.includes(mode as BattleMode)) throw new Error("Mode de jeu invalide.");
        const ratings = Array.isArray(payload.playerRatings) ? payload.playerRatings.map(Number) : undefined;
        const strategy = ["PRUDENT", "AGGRESSIVE", "STRATEGIC", "OPPORTUNISTIC"].includes(String(payload.strategy)) ? payload.strategy as "PRUDENT" | "AGGRESSIVE" | "STRATEGIC" | "OPPORTUNISTIC" : "STRATEGIC";
        const match = createBattleRoyale(seed, mode as BattleMode, dropLocationId, ["Ton équipe"], ratings, strategy);
        match.id = `${match.id}-${socket.id.slice(0, 6)}`;
        matches.set(match.id, match);
        socket.join(match.id);
        socket.emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Impossible de créer la partie." });
      }
    });

    socket.on("battle:bus:destination", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Destination invalide.");
        const match = matches.get(String(payload.matchId ?? ""));
        if (!match) throw new Error("Partie introuvable.");
        setBattleBusDestination(match, String(payload.locationId ?? ""), payload.landingZone === "CENTER" || payload.landingZone === "ROOFTOPS" || payload.landingZone === "OUTSKIRTS" ? payload.landingZone : undefined);
        io.to(match.id).emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Impossible de changer de destination." });
      }
    });

    socket.on("battle:bus:jump", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Action de saut invalide.");
        const match = matches.get(String(payload.matchId ?? ""));
        if (!match) throw new Error("Partie introuvable.");
        jumpBattleBus(match);
        io.to(match.id).emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Impossible de sauter." });
      }
    });

    socket.on("battle:advance", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Paramètres d'avance invalides.");
        const match = matches.get(String(payload.matchId ?? ""));
        if (!match) throw new Error("Partie introuvable.");
        const requested = Number(payload.seconds ?? (match.stage === "DROP" ? 5 : 30));
        if (!Number.isFinite(requested) || requested <= 0) throw new Error("Durée d'avance invalide.");
        if (match.stage === "DROP" && match.bus.status !== "COMPLETE") {
          const userPlan = match.bus.plans.find(plan => plan.teamId === match.userTeam.id);
          if (!userPlan || userPlan.status !== "ON_BUS") {
            throw new Error("Après ton saut, la descente se déroule automatiquement.");
          }
          advanceBattleBus(match, Math.max(1, Math.min(10, Math.floor(requested))));
        } else if (match.stage === "LOOT" || match.stage === "ZONE") {
          advanceMatchTime(match, Math.max(1, Math.min(120, Math.floor(requested))));
        } else {
          throw new Error("Aucune simulation à avancer pour le moment.");
        }
        io.to(match.id).emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Impossible d'avancer la simulation." });
      }
    });

    socket.on("battle:drop", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Action d'atterrissage invalide.");
        const match = matches.get(String(payload.matchId ?? ""));
        if (!match) throw new Error("Partie introuvable.");
        const type = payload.action;
        if (type !== "FIGHT" && type !== "LOOT" && type !== "ROTATE") throw new Error("Choix de spawn invalide.");
        const locationId = typeof payload.locationId === "string" ? payload.locationId : undefined;
        if (type === "ROTATE") resolveDrop(match, { type: "ROTATE", locationId });
        else if (type === "FIGHT") resolveDrop(match, { type: "FIGHT" });
        else resolveDrop(match, { type: "LOOT" });
        io.to(match.id).emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Action impossible." });
      }
    });

    socket.on("battle:action", (payload: unknown) => {
      try {
        if (!isRecord(payload) || !isRecord(payload.action)) throw new Error("Action de jeu invalide.");
        const match = matches.get(String(payload.matchId ?? ""));
        if (!match) throw new Error("Partie introuvable.");
        const action = payload.action;
        if (!actions.includes(String(action.type) as typeof actions[number])) throw new Error("Action inconnue.");
        takeZoneAction(match, action as unknown as BattleAction);
        io.to(match.id).emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Action impossible." });
      }
    });

    socket.on("battle:get", (payload: unknown) => {
      const matchId = isRecord(payload) ? String(payload.matchId ?? "") : "";
      const match = matches.get(matchId);
      if (!match) {
        socket.emit("battle:error", { message: "Partie introuvable." });
        return;
      }
      socket.join(match.id);
      socket.emit("battle:state", match);
    });
  });
}
