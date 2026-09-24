export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function nonNegative(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function nearestStep(value: unknown, steps: readonly number[], fallback: number): number {
  const wanted = Number(value);
  if (!Number.isFinite(wanted)) {
    return fallback;
  }
  let nearest = fallback;
  let best = Number.POSITIVE_INFINITY;
  for (const step of steps) {
    const distance = Math.abs(step - wanted);
    if (distance < best) {
      best = distance;
      nearest = step;
    }
  }
  return nearest;
}
