import type { Page } from "@playwright/test";

export const LETTERS = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآؤئى"];

const JOINER = "ب";
const CHUNK = 200;
const TYPED = [255, 0, 255];

interface Entry {
  readonly pair: string;
  readonly word: string;
  readonly at: number;
}

function entriesOf(): Entry[] {
  const entries: Entry[] = [];
  for (const first of LETTERS) {
    for (const second of LETTERS) {
      const pair = `${first}${second}`;
      entries.push({ pair, word: pair, at: 0 });
      entries.push({ pair, word: `${pair}${JOINER}`, at: 0 });
      entries.push({ pair, word: `${JOINER}${pair}`, at: 1 });
      entries.push({ pair, word: `${JOINER}${pair}${JOINER}`, at: 1 });
    }
  }
  return entries;
}

async function typedInkIn(page: Page, family: string, chunk: readonly Entry[]): Promise<number[]> {
  await page.evaluate(
    ([name, entries]) => {
      document.querySelector("#census")?.remove();
      const box = document.createElement("div");
      box.id = "census";
      box.setAttribute("lang", "ar");
      box.setAttribute("dir", "rtl");
      box.style.cssText = `position:absolute;left:0;top:0;width:1400px;background:#000;display:flex;flex-wrap:wrap;gap:10px;padding:10px;font-family:"${name}";font-size:64px;line-height:1.6;color:#00ffff;z-index:99999`;
      for (const entry of entries) {
        const word = document.createElement("span");
        word.style.cssText = "display:inline-block;padding:0 8px";
        word.textContent = entry.word;
        box.append(word);
      }
      document.body.append(box);
      const ranges = [...box.children].map((span, index) => {
        const text = span.firstChild;
        if (!(text instanceof Text)) {
          throw new Error("no text");
        }
        const range = document.createRange();
        const at = entries[index]?.at ?? 0;
        range.setStart(text, at);
        range.setEnd(text, at + 1);
        return range;
      });
      const sheet = new CSSStyleSheet();
      sheet.replaceSync("::highlight(census){color:#ff00ff}");
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      CSS.highlights.set("census", new Highlight(...ranges));
    },
    [family, chunk] as const,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const image = (await page.locator("#census").screenshot()).toString("base64");
  const boxes = await page.evaluate(() => {
    const origin = document.querySelector("#census")?.getBoundingClientRect();
    return [...(document.querySelector("#census")?.children ?? [])].map((span) => {
      const rect = span.getBoundingClientRect();
      return [rect.x - (origin?.x ?? 0), rect.y - (origin?.y ?? 0), rect.width, rect.height];
    });
  });
  return page.evaluate(
    async ([data, rects, wanted]) => {
      const bytes = Uint8Array.from(atob(data ?? ""), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
      if (context === null) {
        throw new Error("no canvas");
      }
      context.drawImage(bitmap, 0, 0);
      const picture = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const scale = picture.width / 1400;
      return (rects ?? []).map(([x = 0, y = 0, width = 0, height = 0]) => {
        let count = 0;
        const left = Math.floor(x * scale);
        const top = Math.floor(y * scale);
        for (let row = top; row < Math.min(picture.height, top + Math.ceil(height * scale)); row += 1) {
          for (let column = left; column < Math.min(picture.width, left + Math.ceil(width * scale)); column += 1) {
            const index = (row * picture.width + column) * 4;
            const near = [0, 1, 2].every(
              (channel) => Math.abs((picture.data[index + channel] ?? 0) - (wanted?.[channel] ?? 0)) <= 6,
            );
            if (near) {
              count += 1;
            }
          }
        }
        return count / (scale * scale);
      });
    },
    [image, boxes, TYPED] as const,
  );
}

export async function typedInkByPair(page: Page, family: string): Promise<Map<string, number>> {
  const entries = entriesOf();
  const least = new Map<string, number>();
  for (let from = 0; from < entries.length; from += CHUNK) {
    const chunk = entries.slice(from, from + CHUNK);
    const counts = await typedInkIn(page, family, chunk);
    for (const [index, entry] of chunk.entries()) {
      least.set(entry.pair, Math.min(least.get(entry.pair) ?? Number.POSITIVE_INFINITY, counts[index] ?? 0));
    }
  }
  return least;
}
