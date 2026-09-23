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
