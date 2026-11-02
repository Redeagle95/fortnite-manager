
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface StormPhase {
  phase: number;
  circle: Circle;
  damagePerSecond: number;
  waitSeconds: number;
  shrinkSeconds: number;
}

export function isInsideCircle(
  x: number,
  y: number,
  circle: Circle
): boolean {
  const dx = x - circle.x;
  const dy = y - circle.y;

  return Math.sqrt(dx * dx + dy * dy) <= circle.radius;
}

export function isCircleInside(
  inner: Circle,
  outer: Circle
): boolean {
  const dx = inner.x - outer.x;
  const dy = inner.y - outer.y;

  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance + inner.radius <= outer.radius;
}

export function createNextCircle(
  previous: Circle,
  nextRadius: number,
  offsetX: number,
  offsetY: number
): Circle {
  if (
    !Number.isFinite(nextRadius) ||
    nextRadius < 0 ||
    nextRadius > previous.radius
  ) {
    throw new Error("Rayon de cercle invalide.");
  }

  const maxOffset = previous.radius - nextRadius;
  const distance = Math.sqrt(offsetX ** 2 + offsetY ** 2);

  if (distance > maxOffset) {
    throw new Error("Le nouveau cercle dépasse la zone précédente.");
  }

  return {
    x: previous.x + offsetX,
    y: previous.y + offsetY,
    radius: nextRadius,
  };
}

export function getStormDamage(
  damagePerSecond: number,
  seconds: number
): number {
  if (
    !Number.isFinite(damagePerSecond) ||
    !Number.isFinite(seconds) ||
    damagePerSecond < 0 ||
    seconds < 0
  ) {
    throw new Error("Paramètres de dégâts invalides.");
  }

  return damagePerSecond * seconds;
}
