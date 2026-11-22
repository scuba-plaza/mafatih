import { expect, type Page, test } from "@playwright/test";
import { type InkByColour, inkByColour, inkColours } from "./helpers/ink.ts";
import { differenceBeyondShift } from "./helpers/pixels.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle } from "./helpers/style.ts";
import { startTyping, surface, typeKeys } from "./helpers/typing.ts";

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
const SEPARATION_SHARE = 0.15;
const BOX_PADDING = 6;
const NO_LIGATURES = '"rlig" 0, "liga" 0';
const SAME_PLACE = 0.6;
const JOIN_SHIFT = 2;
const JOIN_SAME = 40;
const JOIN_BROKEN = 120;

async function open(page: Page, font: Font, text: string): Promise<void> {
  await seedSettings(page, { customText: text, vocalization: "letters", font, fontSize: 72 });
  await page.goto("/#/custom");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  await addStyle(page, "[data-caret]{visibility:hidden}");
  await page.evaluate(async (family) => {
    await document.fonts.load(`40px "${family}"`, "لا");
  }, FAMILY[font]);
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

function samePlaces(rects: readonly number[][], baseline: readonly number[][]): boolean {
  return (
    rects.length === baseline.length &&
    rects.every((rect, index) =>
      rect.every((value, side) => Math.abs(value - (baseline[index]?.[side] ?? 0)) < SAME_PLACE),
    )
  );
}

async function inkOfWord(page: Page, length: number): Promise<InkByColour> {
  const image = await page.screenshot({ clip: await wordBox(page, length) });
  return inkByColour(page, image, await inkColours(page));
}

function describeInk(ink: InkByColour) {
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

function unligated(page: Page) {
  return surface(page).locator("[data-unligated]");
}

test("only the word being typed is drawn without ligatures, and the next words keep theirs", async ({ page }) => {
  await open(page, "noto-naskh", "لا لا لا");
  await expect(unligated(page)).toHaveCount(0);
  await typeKeys(page, ["ل"]);
  await expect(unligated(page)).toHaveCount(1);
  await expect(unligated(page)).toHaveText("لا");
  await typeKeys(page, ["ا"]);
  await expect(unligated(page)).toHaveCount(0);
  await typeKeys(page, [" ", "ل"]);
  await expect(unligated(page)).toHaveCount(1);
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
  await expect(surface(page).locator("[data-unligated] [data-mistakes]")).toHaveCount(1);
  await expect(surface(page).locator("[data-lesson-text]")).toHaveText("لسا بتن");
  await typeKeys(page, ["Backspace", "ا"]);
  await expect(mistakes).toHaveCount(0);
  await expect(unligated(page)).toHaveCount(0);
});

for (const font of FONTS) {
  test.describe(FAMILY[font], () => {
    for (const { name, word } of LAM_ALEF) {
      test(`${name} is a ligature here, and with only its lam typed the lam and the alef are painted apart`, async ({
        page,
      }) => {
        await open(page, font, `${word} بتن`);
        const { on, off } = await ligatureWidths(page, word);
        expect(Math.abs(on - off), `${word} must really be a ligature in ${FAMILY[font]}`).toBeGreaterThan(0.4);
        await typeKeys(page, ["ل"]);
        await expect
          .poll(async () => describeInk(await inkOfWord(page, word.length)), { timeout: 5000 })
          .toMatchObject({ separated: true });
      });

      test(`${name}: once the alef is typed the ligature is back and all of it is painted as typed`, async ({
        page,
      }) => {
        await open(page, font, `${word} بتن`);
        await typeKeys(page, [...word]);
        await expect(unligated(page)).toHaveCount(0);
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

    test("words without a lam and its alef are never reshaped while they are typed, Allah included", async ({
      page,
    }) => {
      const text = "بسم الله الرحمن الرحيم كتب";
      await open(page, font, text);
      const keys = [...text].slice(0, -2);
      await typeKeys(page, [keys[0] ?? ""]);
      const baseline = await wordRects(page);
      for (const key of keys.slice(1)) {
        await typeKeys(page, [key]);
        await expect(unligated(page)).toHaveCount(0);
        expect(samePlaces(await wordRects(page), baseline), `no word may move after typing ${key}`).toBe(true);
      }
    });

    test("a word with a lam and its alef is reshaped only while the cursor is between them, then it is back as it was", async ({
      page,
    }) => {
      const text = "كلام لا بتن كتب";
      await open(page, font, text);
      const letters = [...text];
      const keys = letters.slice(0, -2);
      await typeKeys(page, [keys[0] ?? ""]);
      const baseline = await wordRects(page);
      let reshaped = 0;
      for (const [index, key] of keys.slice(1).entries()) {
        const typedIndex = index + 1;
        await typeKeys(page, [key]);
        const between = key === "ل" && ALEF_FORMS.has(letters[typedIndex + 1] ?? "");
        await expect(unligated(page)).toHaveCount(between ? 1 : 0);
        if (between) {
          reshaped += 1;
        } else {
          expect(samePlaces(await wordRects(page), baseline), `no word may move after typing ${key}`).toBe(true);
        }
      }
      expect(reshaped).toBe(2);
    });

    test("cursive joining inside the word that is drawn without ligatures is the same however its text is split or wrapped", async ({
      page,
    }) => {
      await open(page, font, "كلام");
      await typeKeys(page, ["ك", "ل"]);
      await expect(unligated(page)).toHaveCount(1);
      await surface(page)
        .locator("[data-lesson-text]")
        .evaluate((host, features) => {
          const style = getComputedStyle(host);
          const make = (id: string): HTMLElement => {
            const copy = host.cloneNode(true);
            if (!(copy instanceof HTMLElement)) {
              throw new Error("the lesson text is not an element");
            }
            copy.querySelector("[data-caret]")?.remove();
            copy.setAttribute("data-join", id);
            copy.style.cssText = `position:static;width:max-content;height:auto;overflow:visible;margin:8px;font-family:${style.fontFamily};font-size:${style.fontSize}`;
            document.body.append(copy);
            return copy;
          };
          make("split");
          make("merged").querySelector("[data-unligated]")?.normalize();
          const whole = make("whole");
          const wrapper = whole.querySelector("[data-unligated]");
          wrapper?.replaceWith(...(wrapper?.childNodes ?? []));
          whole.normalize();
          whole.style.fontFeatureSettings = features ?? "";
          const broken = make("broken").querySelector("[data-unligated]");
          if (broken !== null) {
            broken.normalize();
            const first = broken.firstChild;
            if (first instanceof Text) {
              first.data = `${first.data.slice(0, 1)}\u200C${first.data.slice(1)}`;
            }
          }
        }, NO_LIGATURES);
      const picture = (id: string) => page.locator(`[data-join="${id}"]`).screenshot();
      const split = await picture("split");
      const shift = Math.round(JOIN_SHIFT * (await page.evaluate(() => window.devicePixelRatio)));
      const apart = async (id: string) => differenceBeyondShift(page, split, await picture(id), shift);
      expect(await apart("merged"), "its text in two text nodes or in one").toBeLessThan(JOIN_SAME);
      expect(await apart("whole"), "a wrapper around the word or none").toBeLessThan(JOIN_SAME);
      expect(await apart("broken"), "control: a zero-width non-joiner after the first letter").toBeGreaterThan(
        JOIN_BROKEN,
      );
    });
  });
}
