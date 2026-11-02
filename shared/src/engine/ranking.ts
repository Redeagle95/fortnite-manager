
export interface RankingElimination {
  playerId: string;
  placement: number;
  eliminationOrder: number;
}

export interface RankingState {
  totalPlayers: number;
  remainingPlayerIds: string[];
  eliminations: RankingElimination[];
  winnerId: string | null;
  finalized: boolean;
}

export function createRanking(
  playerIds: string[]
): RankingState {
  if (playerIds.length < 2) {
    throw new Error("Il faut au moins deux joueurs.");
  }

  if (playerIds.some((id) => !id.trim())) {
    throw new Error("Identifiant de joueur invalide.");
  }

  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Identifiants de joueurs en double.");
  }

  return {
    totalPlayers: playerIds.length,
    remainingPlayerIds: [...playerIds].sort(),
    eliminations: [],
    winnerId: null,
    finalized: false,
  };
}

export function recordEliminations(
  ranking: RankingState,
  playerIds: string[]
): RankingState {
  if (ranking.finalized) {
    throw new Error("Le classement est déjà finalisé.");
  }

  if (playerIds.length === 0) {
    throw new Error("Aucune élimination à enregistrer.");
  }

  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Joueur présent plusieurs fois.");
  }

  for (const playerId of playerIds) {
    if (!ranking.remainingPlayerIds.includes(playerId)) {
      throw new Error("Joueur introuvable ou déjà éliminé.");
    }
  }

  // Ordre déterministe pour les éliminations simultanées.
  const orderedIds = [...playerIds].sort();

  const eliminations = orderedIds.map((playerId, index) => ({
    playerId,
    placement:
      ranking.totalPlayers -
      ranking.eliminations.length -
      index,
    eliminationOrder:
      ranking.eliminations.length + index + 1,
  }));

  return {
    ...ranking,
    remainingPlayerIds: ranking.remainingPlayerIds.filter(
      (id) => !orderedIds.includes(id)
    ),
    eliminations: [
      ...ranking.eliminations,
      ...eliminations,
    ],
  };
}

export function finalizeRanking(
  ranking: RankingState
): RankingState {
  if (ranking.finalized) {
    throw new Error("Le classement est déjà finalisé.");
  }

  if (ranking.remainingPlayerIds.length !== 1) {
    throw new Error(
      "Il doit rester exactement un joueur vivant."
    );
  }

  return {
    ...ranking,
    winnerId: ranking.remainingPlayerIds[0],
    finalized: true,
  };
}
