import { expect, test } from "@playwright/test";
import { ligatureAt } from "../src/typing/ligature.ts";
import { LETTERS, typedInkByPair } from "./helpers/census.ts";
import { seedSettings } from "./helpers/profile.ts";
import { surface } from "./helpers/typing.ts";

type Font = "noto-naskh" | "scheherazade" | "amiri";

const FAMILY: Readonly<Record<Font, string>> = {
  "noto-naskh": "Noto Naskh Arabic",
  scheherazade: "Scheherazade New",
  amiri: "Amiri",
};

const ONE_GLYPH: Readonly<Record<Font, readonly string[]>> = {
  "noto-naskh": [],
  scheherazade: ["لا", "لأ", "لإ", "لآ"],
  amiri: [],
};

const NO_INK = 3;

test("the pairs of letters a font draws as one glyph are the lam-alef pairs the app splits itself", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "only Chromium paints a highlight over half a glyph as none");
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1450, height: 900 });
  for (const font of Object.keys(FAMILY) as Font[]) {
    await page.goto("about:blank");
    await seedSettings(page, { customText: "لا", vocalization: "letters", font, fontSize: 40 });
    await page.goto("/#/custom");
    await expect(surface(page)).toBeVisible();
    await page.evaluate(async (family) => {
      await document.fonts.load(`40px "${family}"`, "لا");
    }, FAMILY[font]);
    const ink = await typedInkByPair(page, FAMILY[font]);
    const oneGlyph = LETTERS.flatMap((first) => LETTERS.map((second) => `${first}${second}`)).filter(
      (pair) => (ink.get(pair) ?? 0) < NO_INK,
    );
    expect(oneGlyph.sort(), `${font}: pairs drawn as one glyph`).toEqual([...ONE_GLYPH[font]].sort());
    for (const pair of oneGlyph) {
      expect(ligatureAt(`${pair} `, 1, 0, 2), `${font}: ${pair} is split by the app`).not.toBeNull();
    }
  }
});
