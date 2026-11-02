
export interface HealthState {
  health: number;
  shield: number;
  isAlive: boolean;
}

export interface DamageResult {
  state: HealthState;
  damageToShield: number;
  damageToHealth: number;
  eliminated: boolean;
}

export function createHealth(): HealthState {
  return {
    health: 100,
    shield: 0,
    isAlive: true,
  };
}

export function applyDamage(
  state: HealthState,
  damage: number
): DamageResult {
  if (!Number.isFinite(damage) || damage < 0) {
    throw new Error("Dégâts invalides.");
  }

  if (!state.isAlive) {
    return {
      state: { ...state },
      damageToShield: 0,
      damageToHealth: 0,
      eliminated: true,
    };
  }

  const damageToShield = Math.min(state.shield, damage);
  const remainingDamage = damage - damageToShield;

  const damageToHealth = Math.min(
    state.health,
    remainingDamage
  );

  const health = state.health - damageToHealth;
  const shield = state.shield - damageToShield;

  const isAlive = health > 0;

  return {
    state: {
      health,
      shield,
      isAlive,
    },
    damageToShield,
    damageToHealth,
    eliminated: !isAlive,
  };
}

export function addShield(
  state: HealthState,
  amount: number
): HealthState {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Quantité de bouclier invalide.");
  }

  return {
    ...state,
    shield: Math.min(100, state.shield + amount),
  };
}

export function heal(
  state: HealthState,
  amount: number
): HealthState {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Quantité de soin invalide.");
  }

  if (!state.isAlive) {
    return { ...state };
  }

  return {
    ...state,
    health: Math.min(100, state.health + amount),
  };
}
