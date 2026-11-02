
export type PlayerRole =
  | "IGL"
  | "FRAGGER"
  | "SUPPORT"
  | "FLEX";

export type PlayStyle =
  | "AGGRESSIVE"
  | "PRUDENT"
  | "TACTICAL"
  | "DEFENSIVE"
  | "BALANCED";

export type WeaponCategory =
  | "ASSAULT_RIFLE"
  | "SHOTGUN"
  | "SMG"
  | "SNIPER"
  | "PISTOL";

// Les spécialités sont indépendantes du rôle.
export type PlayerSpecialty = WeaponCategory;

export interface RoleMastery {
  role: PlayerRole;
  mastery: number;
  lastPracticedAt: number | null;
}

export interface WeaponMastery {
  category: WeaponCategory;
  mastery: number;
  lastPracticedAt: number | null;
}

export type TrainingSkill =
  | "AIM"
  | "ENDGAME"
  | "SURVIVAL"
  | "EXPERIENCE"
  | "CLUTCH"
  | "CONSISTENCY";

export interface TrainingProgress {
  skill: TrainingSkill;
  level: number;
  potential: number;
  totalTrainingMinutes: number;
  lastTrainedAt: number | null;
}

export interface PlayerProgression {
  currentRole: PlayerRole;
  currentSpecialty: PlayerSpecialty;
  playStyle: PlayStyle;

  roles: RoleMastery[];
  weapons: WeaponMastery[];
  training: TrainingProgress[];

  overallPotential: number;

  lastRoleChangeAt: number | null;
  lastSpecialtyChangeAt: number | null;
}

export type RoleChangeResult =
  | "SUCCESS"
  | "SAME_ROLE"
  | "NOT_IN_LOBBY"
  | "NOT_CONFIRMED";

export type SpecialtyChangeResult =
  | "SUCCESS"
  | "SAME_SPECIALTY"
  | "NOT_IN_LOBBY"
  | "NOT_CONFIRMED";

export function createPlayerProgression(
  initialRole: PlayerRole = "FRAGGER",
  initialPlayStyle: PlayStyle = "BALANCED",
  now: number = Date.now()
): PlayerProgression {
  return {
    currentRole: initialRole,
    currentSpecialty: "ASSAULT_RIFLE",
    playStyle: initialPlayStyle,

    lastRoleChangeAt: null,
    lastSpecialtyChangeAt: null,

    overallPotential: 100,

    roles: ([
  "IGL",
  "FRAGGER",
  "SUPPORT",
  "FLEX",
] as PlayerRole[]).map((role) => ({
  role,
  mastery: 0,
  lastPracticedAt: null,
})),

    weapons: ([
  "ASSAULT_RIFLE",
  "SHOTGUN",
  "SMG",
  "SNIPER",
  "PISTOL",
] as WeaponCategory[]).map((category) => ({
  category,
  mastery: 0,
  lastPracticedAt: null,
})),

    training: ([
  "AIM",
  "ENDGAME",
  "SURVIVAL",
  "EXPERIENCE",
  "CLUTCH",
  "CONSISTENCY",
] as TrainingSkill[]).map((skill) => ({
  skill,
  level: 0,
  potential: 100,
  totalTrainingMinutes: 0,
  lastTrainedAt: null,
})),
  };
}

export function changePlayerRole(
  progression: PlayerProgression,
  newRole: PlayerRole,
  isInLobby: boolean,
  confirmed: boolean,
  now: number = Date.now()
): RoleChangeResult {
  if (!isInLobby) {
    return "NOT_IN_LOBBY";
  }

  if (progression.currentRole === newRole) {
    return "SAME_ROLE";
  }

  if (!confirmed) {
    return "NOT_CONFIRMED";
  }

  const oldRole = progression.roles.find(
    (role) => role.role === progression.currentRole
  );

  if (oldRole) {
    oldRole.mastery *= 0.75;
  }

  progression.currentRole = newRole;
  progression.lastRoleChangeAt = now;

  return "SUCCESS";
}

export function changePlayerSpecialty(
  progression: PlayerProgression,
  newSpecialty: PlayerSpecialty,
  isInLobby: boolean,
  confirmed: boolean,
  now: number = Date.now()
): SpecialtyChangeResult {
  if (!isInLobby) {
    return "NOT_IN_LOBBY";
  }

  if (progression.currentSpecialty === newSpecialty) {
    return "SAME_SPECIALTY";
  }

  if (!confirmed) {
    return "NOT_CONFIRMED";
  }

  progression.currentSpecialty = newSpecialty;
  progression.lastSpecialtyChangeAt = now;

  return "SUCCESS";
}
