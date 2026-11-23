import type { Page } from "@playwright/test";

export async function clearlyDifferentPixels(page: Page, first: Buffer, second: Buffer): Promise<number> {
  return page.evaluate(
    async ([a, b]) => {
      const pixels = async (data: string): Promise<ImageData> => {
        const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const context = new OffscreenCanvas(image.width, image.height).getContext("2d");
        if (context === null) {
          throw new Error("no canvas");
        }
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [p, q] = [await pixels(a), await pixels(b)];
      if (p.width !== q.width || p.height !== q.height) {
        return Number.POSITIVE_INFINITY;
      }
      let count = 0;
      for (let index = 0; index < p.data.length; index += 4) {
        const delta = [0, 1, 2].map((channel) =>
          Math.abs((p.data[index + channel] ?? 0) - (q.data[index + channel] ?? 0)),
        );
        if (Math.max(...delta) > 48) {
          count += 1;
        }
      }
      return count;
    },
    [first.toString("base64"), second.toString("base64")] as const,
  );
}

export async function brightestPixel(page: Page, image: Buffer): Promise<number> {
  return page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
    if (context === null) {
      throw new Error("no canvas");
    }
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let brightest = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      brightest = Math.max(brightest, ((pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0)) / 3);
    }
    return brightest;
  }, image.toString("base64"));
}

export async function differenceBeyondShift(
  page: Page,
  first: Buffer,
  second: Buffer,
  shift: number,
  tolerance = 48,
): Promise<number> {
  return page.evaluate(
    async ([a, b, reach, delta]) => {
      const decode = async (data: string): Promise<ImageData> => {
        const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const context = new OffscreenCanvas(image.width, image.height).getContext("2d");
        if (context === null) {
          throw new Error("no canvas");
        }
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [p, q] = [await decode(a), await decode(b)];
      const at = (image: ImageData, x: number, y: number, offset: number) =>
        x < image.width && y < image.height ? (image.data[(y * image.width + x) * 4 + offset] ?? 0) : 0;
      const unmatched = (from: ImageData, other: ImageData): number => {
        let count = 0;
        for (let y = 0; y < from.height; y += 1) {
          for (let x = 0; x < from.width; x += 1) {
            let found = false;
            for (let dy = -reach; dy <= reach && !found; dy += 1) {
              for (let dx = -reach; dx <= reach && !found; dx += 1) {
                found = [0, 1, 2].every(
                  (offset) => Math.abs(at(from, x, y, offset) - at(other, x + dx, y + dy, offset)) <= delta,
                );
              }
            }
            if (!found) {
              count += 1;
            }
          }
        }
        return count;
      };
      return Math.max(unmatched(p, q), unmatched(q, p));
    },
    [first.toString("base64"), second.toString("base64"), shift, tolerance] as const,
  );
}

export async function dominantBrightness(page: Page, image: Buffer): Promise<number> {
  return page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
    if (context === null) {
      throw new Error("no canvas");
    }
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const bins = new Map<number, { count: number; sum: number }>();
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
      const bin = bins.get(key) ?? { count: 0, sum: 0 };
      bin.count += 1;
      bin.sum += (red + green + blue) / 3;
      bins.set(key, bin);
    }
    let best = { count: 0, sum: 0 };
    for (const bin of bins.values()) {
      if (bin.count > best.count) {
        best = bin;
      }
    }
    return best.count === 0 ? 0 : best.sum / best.count;
  }, image.toString("base64"));
}
