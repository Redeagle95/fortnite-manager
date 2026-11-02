import type { Server } from "socket.io";
import {
  createBattleRoyale,
  resolveDrop,
  takeZoneAction,
} from "../../shared/src/battle-royale/engine";
import type { BattleAction, BattleMatch, BattleMode } from "../../shared/src/battle-royale/types";

const matches = new Map<string, BattleMatch>();
const modes: BattleMode[] = ["SOLO", "DUO", "TRIO", "SQUAD"];
const actions = ["FIGHT", "LOOT", "REFRESH", "ROTATE", "HEAL", "HOLD_POSITION"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function registerBattleRoyaleSocket(io: Server): void {
  io.on("connection", (socket) => {
    socket.on("battle:create", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Paramètres de partie manquants.");
        const seed = Number(payload.seed);
        const mode = payload.mode;
        const dropLocationId = String(payload.dropLocationId ?? "");
        if (!Number.isInteger(seed)) throw new Error("La seed doit être un entier.");
        if (!modes.includes(mode as BattleMode)) throw new Error("Mode de jeu invalide.");
        const match = createBattleRoyale(seed, mode as BattleMode, dropLocationId);
        match.id = `${match.id}-${socket.id.slice(0, 6)}`;
        matches.set(match.id, match);
        socket.join(match.id);
        socket.emit("battle:state", match);
      } catch (error) {
        socket.emit("battle:error", { message: error instanceof Error ? error.message : "Impossible de créer la partie." });
      }
    });

    socket.on("battle:drop", (payload: unknown) => {
      try {
        if (!isRecord(payload)) throw new Error("Action d'atterrissage invalide.");
        const match = matches.get(String(payload.matchId ?? ""));
        if (!match) throw new Error("Partie introuvable.");
        const type = payload.action;
        if (type !== "FIGHT" && type !== "LOOT" && type !== "ROTATE") throw new Error("Choix de spawn invalide.");
        resolveDrop(match, { type });
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
        if (!actions.includes(String(action.type))) throw new Error("Action inconnue.");
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
