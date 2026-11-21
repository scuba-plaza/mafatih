import { expect, type Page, test } from "@playwright/test";
import { type InkByColour, inkByColour, inkColours } from "./helpers/ink.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle } from "./helpers/style.ts";
import { startTyping, surface, typeKeys } from "./helpers/typing.ts";

type Font = "noto-naskh" | "scheherazade" | "amiri";

interface Case {
  readonly name: string;
  readonly word: string;
  readonly typed: readonly string[];
}

const FAMILY: Readonly<Record<Font, string>> = {
  "noto-naskh": "Noto Naskh Arabic",
  scheherazade: "Scheherazade New",
  amiri: "Amiri",
};

const LAM_ALIF: readonly Case[] = [
  { name: "lam alif", word: "لا", typed: ["ل"] },
  { name: "lam alif with hamza above", word: "لأ", typed: ["ل"] },
  { name: "lam alif with hamza below", word: "لإ", typed: ["ل"] },
  { name: "lam alif with madda", word: "لآ", typed: ["ل"] },
];

const ALLAH: readonly Case[] = [
  { name: "Allah after the alif", word: "الله", typed: ["ا"] },
  { name: "Allah after the first lam", word: "الله", typed: ["ا", "ل"] },
  { name: "Allah after the second lam", word: "الله", typed: ["ا", "ل", "ل"] },
];

const AMIRI_PAIRS: readonly Case[] = [
  { name: "lam jeem", word: "لج", typed: ["ل"] },
  { name: "lam meem", word: "لم", typed: ["ل"] },
  { name: "lam hah", word: "لح", typed: ["ل"] },
  { name: "lam khah", word: "لخ", typed: ["ل"] },
  { name: "beh hah", word: "بح", typed: ["ب"] },
  { name: "jeem hah", word: "جح", typed: ["ج"] },
];

const LIGATURES: Readonly<Record<Font, readonly Case[]>> = {
  "noto-naskh": LAM_ALIF,
  scheherazade: [...LAM_ALIF, ...ALLAH],
  amiri: [...LAM_ALIF, ...ALLAH, ...AMIRI_PAIRS],
};

const MIN_INK = 12;
const SEPARATION_SHARE = 0.15;
const NO_LIGATURES = '"rlig" 0, "liga" 0, "clig" 0, "dlig" 0';

async function open(page: Page, font: Font, word: string): Promise<void> {
  await seedSettings(page, { customText: `${word} بتن`, vocalization: "letters", font, fontSize: 72 });
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
    .evaluate((paragraph, size) => {
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.parentElement?.closest("[data-mistakes]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      const range = document.createRange();
      let remaining = size;
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
      const pad = 6;
      return { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
    }, length);
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

test("only the word being typed is drawn without ligatures, and the next words keep theirs", async ({ page }) => {
  await seedSettings(page, { customText: "لا لا لا", vocalization: "letters", font: "noto-naskh", fontSize: 72 });
  await page.goto("/#/custom");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  const unligated = surface(page).locator("[data-unligated]");
  await expect(unligated).toHaveCount(0);
  await typeKeys(page, ["ل"]);
  await expect(unligated).toHaveCount(1);
  await expect(unligated).toHaveText("لا");
  await typeKeys(page, ["ا"]);
  await expect(unligated).toHaveCount(0);
  await typeKeys(page, [" ", "ل"]);
  await expect(unligated).toHaveCount(1);
  expect(
    await surface(page)
      .locator("[data-lesson-text]")
      .evaluate((element) => element.textContent),
  ).toBe("لا لا لا");
});

test("a wrong key in the middle of a ligature keeps the typed letters, the mistake and the rest in place", async ({
  page,
}) => {
  await seedSettings(page, { customText: "لا بتن", vocalization: "letters", font: "noto-naskh", fontSize: 72 });
  await page.goto("/#/custom");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  await typeKeys(page, ["ل", "س"]);
  const mistakes = surface(page).locator("[data-mistakes]");
  await expect(mistakes).toHaveText("س");
  await expect(surface(page).locator("[data-unligated] [data-mistakes]")).toHaveCount(1);
  await expect(surface(page).locator("[data-lesson-text]")).toHaveText("لسا بتن");
  await typeKeys(page, ["Backspace", "ا"]);
  await expect(mistakes).toHaveCount(0);
  await expect(surface(page).locator("[data-unligated]")).toHaveCount(0);
});

for (const font of Object.keys(LIGATURES) as Font[]) {
  test.describe(FAMILY[font], () => {
    for (const { name, word, typed } of LIGATURES[font]) {
      test(`${name} is a ligature here, and with only its first letters typed the typed and the untyped letters are painted apart`, async ({
        page,
      }) => {
        await open(page, font, word);
        const { on, off } = await ligatureWidths(page, word);
        expect(Math.abs(on - off), `${word} must really be a ligature in ${FAMILY[font]}`).toBeGreaterThan(0.4);
        await typeKeys(page, typed);
        await expect
          .poll(async () => describeInk(await inkOfWord(page, word.length)), { timeout: 5000 })
          .toMatchObject({ separated: true });
      });

      test(`${name}: once every letter is typed the ligature is back and all of it is painted as typed`, async ({
        page,
      }) => {
        await open(page, font, word);
        await typeKeys(page, [...word]);
        await expect(surface(page).locator("[data-unligated]")).toHaveCount(0);
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
        expect(Math.abs(shown.width - 12 - on)).toBeLessThan(1);
      });
    }
  });
}
