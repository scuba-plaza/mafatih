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
