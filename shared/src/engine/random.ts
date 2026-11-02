
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed)) {
      throw new Error("La seed doit être un nombre entier.");
    }

    this.state = seed >>> 0;

    if (this.state === 0) {
      this.state = 1;
    }
  }

  next(): number {
    let value = this.state;

    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;

    this.state = value >>> 0;

    return this.state / 4294967296;
  }

  nextInt(min: number, max: number): number {
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      max < min
    ) {
      throw new Error("Bornes invalides.");
    }

    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    if (probability < 0 || probability > 1) {
      throw new Error("La probabilité doit être comprise entre 0 et 1.");
    }

    return this.next() < probability;
  }
}
