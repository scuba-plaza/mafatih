import type { Page } from "@playwright/test";

interface Ink {
  readonly count: number;
  readonly minX: number;
  readonly maxX: number;
}

export interface InkByColour {
  readonly typed: Ink;
  readonly untyped: Ink;
  readonly width: number;
}

export async function inkColours(page: Page): Promise<{ readonly typed: number[]; readonly untyped: number[] }> {
  return page.evaluate(() => {
    const resolve = (token: string): number[] => {
      const probe = document.createElement("div");
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const channels = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g) ?? [];
      probe.remove();
      return channels.slice(0, 3).map(Number);
    };
    return { typed: resolve("--color-typed"), untyped: resolve("--color-upcoming") };
  });
}

export async function inkByColour(
  page: Page,
  image: Buffer,
  colours: { readonly typed: readonly number[]; readonly untyped: readonly number[] },
): Promise<InkByColour> {
  return page.evaluate(
    async ([data, wanted]) => {
      const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
      if (context === null) {
        throw new Error("no canvas");
      }
      context.drawImage(bitmap, 0, 0);
      const { width, height } = bitmap;
      const pixels = context.getImageData(0, 0, width, height).data;
      const channel = (x: number, y: number, offset: number) => pixels[(y * width + x) * 4 + offset] ?? 0;
      const near = (x: number, y: number, colour: readonly number[], tolerance: number) =>
        [0, 1, 2].every((offset) => Math.abs(channel(x, y, offset) - (colour[offset] ?? 0)) <= tolerance);
      const flat = (x: number, y: number) =>
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].every(([dx, dy]) =>
          [0, 1, 2].every(
            (offset) => Math.abs(channel(x, y, offset) - channel(x + (dx ?? 0), y + (dy ?? 0), offset)) <= 3,
          ),
        );
      const tally = (colour: readonly number[]): { count: number; minX: number; maxX: number } => {
        let count = 0;
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        for (let y = 1; y < height - 1; y += 1) {
          for (let x = 1; x < width - 1; x += 1) {
            if (near(x, y, colour, 6) && flat(x, y)) {
              count += 1;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
            }
          }
        }
        return { count, minX, maxX };
      };
      return { typed: tally(wanted.typed), untyped: tally(wanted.untyped), width };
    },
    [image.toString("base64"), colours] as const,
  );
}

const MIN_INK = 12;
const SEPARATION_SHARE = 0.15;

export function describeInk(ink: InkByColour) {
  const tolerance = ink.width * SEPARATION_SHARE;
  return {
    typedPixels: ink.typed.count,
    untypedPixels: ink.untyped.count,
    typedStartsAt: ink.typed.minX,
    untypedEndsAt: ink.untyped.maxX,
    tolerance,
    separated:
      ink.typed.count >= MIN_INK && ink.untyped.count >= MIN_INK && ink.typed.minX >= ink.untyped.maxX - tolerance,
  };
}
