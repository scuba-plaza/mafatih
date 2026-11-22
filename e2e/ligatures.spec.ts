import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { describeInk, type InkByColour, inkByColour, inkColours } from "./helpers/ink.ts";
import { differenceBeyondShift } from "./helpers/pixels.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle } from "./helpers/style.ts";
import { doneText, startTyping, surface, typeKeys } from "./helpers/typing.ts";
import { afterFrames } from "./helpers/waits.ts";

type Font = "noto-naskh" | "scheherazade" | "amiri";

interface Case {
  readonly name: string;
  readonly word: string;
}

const FAMILY: Readonly<Record<Font, string>> = {
  "noto-naskh": "Noto Naskh Arabic",
  scheherazade: "Scheherazade New",
  amiri: "Amiri",
};

const FONTS = Object.keys(FAMILY) as Font[];

const LAM_ALEF: readonly Case[] = [
  { name: "lam alef", word: "لا" },
  { name: "lam alef with hamza above", word: "لأ" },
  { name: "lam alef with hamza below", word: "لإ" },
  { name: "lam alef with madda", word: "لآ" },
];

const ALEF_FORMS = new Set(["ا", "أ", "إ", "آ"]);
const MIN_INK = 12;
const BOX_PADDING = 6;
const NO_LIGATURES = '"rlig" 0, "liga" 0';
const SAME_PLACE = 0.6;
const SAME_PLACE_WEBKIT = 2;
const JOIN_SHIFT = 2;
const JOIN_BROKEN = 120;
const SOLID = 128;
const PAINT_SAME = 10;
const SAME_FACTOR = 3;
const MARKS = /[\u064B-\u065F\u0670]/u;
const SHAPE_WORDS = ["لا", "لأ", "لإ", "لآ", "بلا", "كلام", "بلاد", "ولا", "لَا", "كُلَّا", "وَلَا", "بِلَّا"];

async function pictureShift(page: Page): Promise<number> {
  return Math.round(JOIN_SHIFT * (await page.evaluate(() => window.devicePixelRatio)));
}

function keysOf(word: string): string[] {
  return [...word].filter((letter) => !MARKS.test(letter));
}

function keysUpToLam(word: string): string[] {
  const keys = keysOf(word);
  return keys.slice(0, keys.indexOf("ل") + 1);
}

async function open(page: Page, font: Font, text: string, caret = false): Promise<void> {
  await seedSettings(page, { customText: text, vocalization: "letters", font, fontSize: 72 });
  await page.goto("/#/custom");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  if (!caret) {
    await addStyle(page, "[data-caret]{visibility:hidden}");
  }
  await page.evaluate(async (family) => {
    await document.fonts.load(`40px "${family}"`, "لا");
    await document.fonts.ready;
  }, FAMILY[font]);
  await afterFrames(page, 3);
}

async function ligatureWidths(page: Page, word: string): Promise<{ readonly on: number; readonly off: number }> {
  return surface(page)
    .locator("[data-lesson-text]")
    .evaluate(
      (host, [text, features]) => {
        const style = getComputedStyle(host);
        const probe = document.createElement("span");
        probe.setAttribute("lang", "ar");
        probe.setAttribute("dir", "rtl");
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${style.fontFamily};font-size:${style.fontSize}`;
        probe.textContent = text ?? "";
        document.body.append(probe);
        const on = probe.getBoundingClientRect().width;
        probe.style.fontFeatureSettings = features ?? "";
        const off = probe.getBoundingClientRect().width;
        probe.remove();
        return { on, off };
      },
      [word, NO_LIGATURES] as const,
    );
}

async function wordBox(page: Page, length: number) {
  return surface(page)
    .locator("[data-block]")
    .first()
    .evaluate(
      (paragraph, [size, pad]) => {
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) =>
            node.parentElement?.closest("[data-mistakes]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
        });
        const range = document.createRange();
        let remaining = size ?? 0;
        let started = false;
        for (let node = walker.nextNode(); node !== null && remaining > 0; node = walker.nextNode()) {
          if (!(node instanceof Text)) {
            continue;
          }
          if (!started) {
            range.setStart(node, 0);
            started = true;
          }
          const taken = Math.min(remaining, node.data.length);
          range.setEnd(node, taken);
          remaining -= taken;
        }
        const box = range.getBoundingClientRect();
        const margin = pad ?? 0;
        return { x: box.x - margin, y: box.y - margin, width: box.width + 2 * margin, height: box.height + 2 * margin };
      },
      [length, BOX_PADDING] as const,
    );
}

async function wordRects(page: Page): Promise<number[][]> {
  return surface(page)
    .locator("[data-block]")
    .first()
    .evaluate((paragraph) => {
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.parentElement?.closest("[data-mistakes]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      const nodes: Text[] = [];
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        if (node instanceof Text) {
          nodes.push(node);
        }
      }
      const data = nodes.map((node) => node.data).join("");
      const place = (offset: number, edge: "start" | "end"): [Text, number] => {
        let remaining = offset;
        for (const node of nodes) {
          if (edge === "start" ? remaining < node.data.length : remaining <= node.data.length) {
            return [node, remaining];
          }
          remaining -= node.data.length;
        }
        throw new Error("offset outside the text");
      };
      const rects: number[][] = [];
      for (const match of data.matchAll(/[^\s]+/gu)) {
        const start = match.index ?? 0;
        const from = place(start, "start");
        const to = place(start + match[0].length, "end");
        const range = document.createRange();
        range.setStart(from[0], from[1]);
        range.setEnd(to[0], to[1]);
        const box = range.getBoundingClientRect();
        rects.push([box.x, box.y, box.width, box.height]);
      }
      return rects;
    });
}

function placeTolerance(testInfo: TestInfo): number {
  return testInfo.project.name.startsWith("webkit") ? SAME_PLACE_WEBKIT : SAME_PLACE;
}

function samePlaces(rects: readonly number[][], baseline: readonly number[][], tolerance: number): boolean {
  return (
    rects.length === baseline.length &&
    rects.every((rect, index) =>
      rect.every((value, side) => Math.abs(value - (baseline[index]?.[side] ?? 0)) < tolerance),
    )
  );
}

async function inkOfWord(page: Page, length: number): Promise<InkByColour> {
  const image = await page.screenshot({ clip: await wordBox(page, length) });
  return inkByColour(page, image, await inkColours(page));
}

function splitWord(page: Page) {
  return surface(page).locator("[data-block][data-split]");
}

async function withoutHighlights(page: Page): Promise<void> {
  await page.evaluate(() => {
    CSS.highlights.clear();
    CSS.highlights.set = () => CSS.highlights;
  });
}

async function runsInBlock(page: Page): Promise<number> {
  return surface(page)
    .locator("[data-block]")
    .first()
    .evaluate((block) => block.childNodes.length);
}

async function equalColours(page: Page): Promise<void> {
  await addStyle(page, ":root{--color-typed:#ff00ff;--color-upcoming:#ff00ff}");
}

async function silhouetteOfWord(page: Page, length: number): Promise<Buffer> {
  return page.screenshot({ clip: await wordBox(page, length) });
}

test("only the word being typed while its cursor is between a lam and its alef is marked, and nothing moves", async ({
  page,
}, testInfo) => {
  await open(page, "noto-naskh", "لا لا لا");
  await expect(splitWord(page)).toHaveCount(0);
  const baseline = await wordRects(page);
  await typeKeys(page, ["ل"]);
  await expect(splitWord(page)).toHaveCount(1);
  await expect(splitWord(page)).toHaveAttribute("data-from", "0");
  expect(await runsInBlock(page), "the text stays one run").toBe(1);
  expect(await doneText(page), "the lam is typed text").toBe("ل");
  expect(samePlaces(await wordRects(page), baseline, placeTolerance(testInfo)), "no word may move").toBe(true);
  await typeKeys(page, ["ا"]);
  await expect(splitWord(page)).toHaveCount(0);
  expect(await doneText(page), "the whole word is typed text").toBe("لا");
  await typeKeys(page, [" ", "ل"]);
  await expect(splitWord(page)).toHaveCount(1);
  expect(samePlaces(await wordRects(page), baseline, placeTolerance(testInfo)), "no word may move").toBe(true);
  expect(
    await surface(page)
      .locator("[data-lesson-text]")
      .evaluate((element) => element.textContent),
  ).toBe("لا لا لا");
});

test("a wrong key in the middle of a ligature keeps the typed letters, the mistake and the rest in place", async ({
  page,
}) => {
  await open(page, "noto-naskh", "لا بتن");
  await typeKeys(page, ["ل", "س"]);
  const mistakes = surface(page).locator("[data-mistakes]");
  await expect(mistakes).toHaveText("س");
  await expect(splitWord(page)).toHaveCount(0);
  await expect(surface(page).locator("[data-lesson-text]")).toHaveText("لسا بتن");
  await typeKeys(page, ["Backspace"]);
  await expect(mistakes).toHaveCount(0);
  await expect(splitWord(page)).toHaveCount(1);
  await typeKeys(page, ["ا"]);
  await expect(splitWord(page)).toHaveCount(0);
});

for (const font of FONTS) {
  test.describe(FAMILY[font], () => {
    for (const { name, word } of LAM_ALEF) {
      test(`${name} stays the ligature with only its lam typed, and the two halves of it are painted typed and untyped`, async ({
        page,
      }) => {
        await open(page, font, `${word} بتن`);
        const { on, off } = await ligatureWidths(page, word);
        expect(Math.abs(on - off), `${word} must really be a ligature in ${FAMILY[font]}`).toBeGreaterThan(0.4);
        await typeKeys(page, ["ل"]);
        await expect(splitWord(page)).toHaveCount(1);
        const shown = await wordBox(page, word.length);
        expect(Math.abs(shown.width - 2 * BOX_PADDING - on), "drawn as the ligature, not as two letters").toBeLessThan(
          1,
        );
        await expect
          .poll(async () => describeInk(await inkOfWord(page, word.length)), { timeout: 5000 })
          .toMatchObject({ separated: true });
      });

      test(`${name}: once the alef is typed the ligature is back and all of it is painted as typed`, async ({
        page,
      }) => {
        await open(page, font, `${word} بتن`);
        await typeKeys(page, [...word]);
        await expect(splitWord(page)).toHaveCount(0);
        await expect
          .poll(
            async () => {
              const ink = await inkOfWord(page, word.length);
              return { typedPixels: ink.typed.count >= MIN_INK, strayUntypedPixels: ink.untyped.count };
            },
            { timeout: 5000 },
          )
          .toEqual({ typedPixels: true, strayUntypedPixels: 0 });
        const { on } = await ligatureWidths(page, word);
        const shown = await wordBox(page, word.length);
        expect(Math.abs(shown.width - 2 * BOX_PADDING - on)).toBeLessThan(1);
      });
    }

    for (const word of SHAPE_WORDS) {
      test(`${word}: painting its two halves does not change the shape of the ligature`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name.startsWith("webkit"),
          "WebKit on Linux draws text that is painted apart from the rest at another height",
        );
        await open(page, font, `${word} بتن`);
        await equalColours(page);
        await typeKeys(page, keysUpToLam(word));
        await expect(splitWord(page)).toHaveCount(1);
        const painted = await silhouetteOfWord(page, word.length);
        await addStyle(page, "[data-split]::after{display:none}");
        await withoutHighlights(page);
        const plain = await silhouetteOfWord(page, word.length);
        await addStyle(page, '[data-split]{font-feature-settings:"rlig" 0,"liga" 0}');
        const unligated = await silhouetteOfWord(page, word.length);
        const shift = await pictureShift(page);
        expect(await differenceBeyondShift(page, painted, plain, shift, SOLID), "painted or plain").toBeLessThan(
          PAINT_SAME,
        );
        expect(
          await differenceBeyondShift(page, unligated, plain, shift, SOLID),
          "control: the ligature switched off looks different",
        ).toBeGreaterThan(JOIN_BROKEN);
      });

      test(`${word} looks like the ligature it is when done, with only its lam typed`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name.startsWith("webkit"),
          "WebKit on Linux draws split text nodes at another height",
        );
        await open(page, font, `${word} بتن`);
        await equalColours(page);
        const keys = keysOf(word);
        const upToLam = keysUpToLam(word);
        await typeKeys(page, upToLam);
        await expect(splitWord(page)).toHaveCount(1);
        const between = await silhouetteOfWord(page, word.length);
        await addStyle(page, '[data-split]{font-feature-settings:"rlig" 0,"liga" 0}');
        const unligated = await silhouetteOfWord(page, word.length);
        await typeKeys(page, keys.slice(upToLam.length));
        await expect(splitWord(page)).toHaveCount(0);
        const done = await silhouetteOfWord(page, word.length);
        const shift = await pictureShift(page);
        const same = await differenceBeyondShift(page, between, done, shift, SOLID);
        const broken = await differenceBeyondShift(page, unligated, done, shift, SOLID);
        expect(broken, "control: the ligature switched off looks different").toBeGreaterThan(JOIN_BROKEN);
        expect(same * SAME_FACTOR, "the same ligature as when it is done").toBeLessThan(broken);
      });
    }

    test("the word is still drawn under forced colours while only its lam is typed", async ({ page }) => {
      await open(page, font, "لا بتن");
      await page.emulateMedia({ forcedColors: "active" });
      await typeKeys(page, ["ل"]);
      await expect(splitWord(page)).toHaveCount(1);
      const clip = await wordBox(page, 2);
      const image = await page.screenshot({ clip });
      const ink = await page.evaluate(async (data) => {
        const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
        if (context === null) {
          throw new Error("no canvas");
        }
        context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
        const background = [pixels[0] ?? 0, pixels[1] ?? 0, pixels[2] ?? 0];
        let count = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            [0, 1, 2].some((channel) => Math.abs((pixels[index + channel] ?? 0) - (background[channel] ?? 0)) > 100)
          ) {
            count += 1;
          }
        }
        return count;
      }, image.toString("base64"));
      expect(ink).toBeGreaterThan(MIN_INK);
    });

    test("a word wider than the line stays whole, and nothing spills sideways", async ({ page }) => {
      await seedSettings(page, {
        customText: "كلاكلاكلاكلاكلاكلاكلا بتن",
        vocalization: "letters",
        font,
        fontSize: 96,
      });
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto("/#/custom");
      await expect(surface(page)).toBeVisible();
      await startTyping(page);
      await addStyle(page, "[data-caret]{visibility:hidden}");
      await page.evaluate(() => document.fonts.ready);
      await typeKeys(page, ["ك", "ل"]);
      await expect(splitWord(page)).toHaveCount(1);
      await afterFrames(page, 4);
      const spill = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(spill).toBeLessThanOrEqual(0);
      const image = await surface(page).locator("[data-lesson-text]").screenshot();
      const ink = await inkByColour(page, image, await inkColours(page));
      expect(ink.untyped.count).toBeGreaterThan(MIN_INK);
    });

    test("the caret sits at the line where the two halves meet", async ({ page }) => {
      await open(page, font, "لا بتن", true);
      await typeKeys(page, ["ل"]);
      await expect(splitWord(page)).toHaveCount(1);
      const caret = surface(page).locator("[data-caret]");
      await expect(caret).toBeVisible();
      const glyph = await wordBox(page, 2);
      const box = await caret.boundingBox();
      expect(box).not.toBeNull();
      const middle = glyph.x + glyph.width / 2;
      expect(Math.abs((box?.x ?? 0) - middle)).toBeLessThan(glyph.width * 0.1);
    });

    test("no word is ever reshaped or moved while typing, Allah and the lam-alef words included", async ({
      page,
    }, testInfo) => {
      const text = "بسم الله الرحمن الرحيم كلام لا بتن كتب";
      await open(page, font, text);
      const letters = [...text];
      const keys = letters.slice(0, -2);
      await typeKeys(page, [keys[0] ?? ""]);
      const baseline = await wordRects(page);
      let marked = 0;
      for (const [index, key] of keys.slice(1).entries()) {
        const typedIndex = index + 1;
        await typeKeys(page, [key]);
        const between = key === "ل" && ALEF_FORMS.has(letters[typedIndex + 1] ?? "");
        await expect(splitWord(page)).toHaveCount(between ? 1 : 0);
        marked += between ? 1 : 0;
        expect(
          samePlaces(await wordRects(page), baseline, placeTolerance(testInfo)),
          `no word may move after typing ${key}`,
        ).toBe(true);
      }
      expect(marked).toBe(2);
    });
  });
}
