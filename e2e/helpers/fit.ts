import { expect, type Page } from "@playwright/test";

export interface OneScreen {
  readonly header: boolean;
  readonly player: boolean;
  readonly guide: boolean;
  readonly tabBar?: boolean;
  readonly reserve?: number;
}

interface Box {
  readonly top: number;
  readonly bottom: number;
}

interface Facts {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly scroll: { readonly width: number; readonly height: number };
  readonly overflow: readonly string[];
  readonly regions: Record<string, Box | null>;
}

const REGIONS = {
  header: "header > div",
  window: "[data-lesson-text]",
  guide: "[data-guide-keyboard]",
  tabBar: "[data-tabbar]",
};

const TAB_BAR_BELOW = 768;

function collect(selectors: Record<string, string>): Facts {
  const boxOf = (selector: string): Box | null => {
    const element = document.querySelector(selector);
    if (element === null) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || rect.height === 0
      ? null
      : { top: rect.top, bottom: rect.bottom };
  };
  const main = document.querySelector("main");
  const owners = [document.documentElement, document.body, main?.parentElement, main];
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    overflow: owners.map((owner) => (owner ? getComputedStyle(owner).overflowY : "missing")),
    regions: Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, boxOf(selector)])),
  };
}

export async function expectOneScreen(page: Page, expected: OneScreen): Promise<void> {
  const facts = await page.evaluate(collect, REGIONS);
  const { viewport, scroll, overflow, regions } = facts;
  const { tabBar = viewport.width < TAB_BAR_BELOW, reserve = 0 } = expected;

  expect(scroll.height, "the page must not scroll vertically").toBeLessThanOrEqual(viewport.height);
  expect(scroll.width, "the page must not scroll sideways").toBeLessThanOrEqual(viewport.width);
  expect(overflow, "no ancestor may hide overflow, or this check could never fail").not.toContain("hidden");
  expect(overflow).not.toContain("clip");

  const expectations: ReadonlyArray<readonly [string, boolean, number]> = [
    ["header", expected.header, 0],
    ["window", true, reserve],
    ["guide", expected.guide, reserve],
    ["tabBar", tabBar, 0],
  ];
  for (const [name, shown, bottomReserve] of expectations) {
    const box = regions[name];
    if (!shown) {
      expect(box, `${name} must not be on screen`).toBeNull();
      continue;
    }
    expect(box, `${name} must be on screen`).not.toBeNull();
    expect(box?.top, `${name} starts inside the screen`).toBeGreaterThanOrEqual(-1);
    expect(box?.bottom, `${name} ends inside the screen`).toBeLessThanOrEqual(viewport.height - bottomReserve + 1);
  }

  if (expected.player) {
    const play = page.getByRole("button", { name: "Play", exact: true });
    await expect(play).toBeVisible();
    const box = await play.boundingBox();
    expect(box, "the play button has a box").not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0), "the player ends inside the screen").toBeLessThanOrEqual(
      viewport.height - reserve + 1,
    );
    const uncovered = await play.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return top !== null && button.contains(top);
    });
    expect(uncovered, "nothing covers the play button").toBe(true);
  }
}
