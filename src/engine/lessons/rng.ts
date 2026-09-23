export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
}

export function createRng(seed: number): Rng {
  let state = (seed | 0) === 0 ? 0x9e3779b9 : seed | 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);

  function pick<T>(items: readonly T[]): T {
    const item = items[int(items.length)];
    if (item === undefined) {
      throw new Error("pick from empty list");
    }
    return item;
  }

  function weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    for (const item of items) {
      total += Math.max(0, weight(item));
    }
    if (total <= 0) {
      return pick(items);
    }
    let roll = next() * total;
    for (const item of items) {
      roll -= Math.max(0, weight(item));
      if (roll <= 0) {
        return item;
      }
    }
    const last = items[items.length - 1];
    if (last === undefined) {
      throw new Error("weighted pick from empty list");
    }
    return last;
  }

  return { next, int, pick, weighted };
}
