
export interface Position {
  x: number;
  y: number;
}

export interface MovementStats {
  walkSpeed: number;
  sprintSpeed: number;
}

export function calculateDistance(
  from: Position,
  to: Position
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function canMoveTo(
  position: Position,
  destination: Position,
  mapWidth: number,
  mapHeight: number
): boolean {
  return (
    Number.isFinite(destination.x) &&
    Number.isFinite(destination.y) &&
    destination.x >= 0 &&
    destination.y >= 0 &&
    destination.x <= mapWidth &&
    destination.y <= mapHeight &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y)
  );
}

export function movePlayer(
  position: Position,
  destination: Position,
  speed: number,
  deltaSeconds: number,
  mapWidth: number,
  mapHeight: number
): Position {
  if (
    !Number.isFinite(speed) ||
    speed < 0 ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds < 0
  ) {
    throw new Error("Paramètres de déplacement invalides.");
  }

  if (!canMoveTo(position, destination, mapWidth, mapHeight)) {
    throw new Error("Destination invalide.");
  }

  const distance = calculateDistance(position, destination);

  if (distance === 0) {
    return { ...position };
  }

  const maxDistance = speed * deltaSeconds;
  const ratio = Math.min(1, maxDistance / distance);

  return {
    x: position.x + (destination.x - position.x) * ratio,
    y: position.y + (destination.y - position.y) * ratio,
  };
}
