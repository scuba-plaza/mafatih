import { expect, type Page } from "@playwright/test";
import { surface } from "./typing.ts";

interface OneScreen {
  readonly header: boolean;
  readonly player: boolean;
  readonly guide: boolean | "either";
  readonly tabBar?: boolean;
  readonly reserve?: number;
  readonly pager?: boolean;
}

interface Box {
  readonly top: number;
  readonly bottom: number;
}

interface Facts {
  readonly stage: { readonly scroll: number; readonly client: number } | null;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly scroll: { readonly width: number; readonly height: number };
  readonly overflow: readonly string[];
  readonly regions: Record<string, Box | null>;
}

const REGIONS = {
  header: "header > div",
  pager: "[data-pager]",
  window: "[data-lesson-text]",
  guide: "[data-guide-keyboard]",
  footer: "[data-footer]",
  tabBar: "[data-tabbar]",
};

const ORDER = ["header", "pager", "window", "guide", "footer", "tabBar"] as const;

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
  const stage = document.querySelector("[data-stage]");
  const owners = [document.documentElement, document.body, main?.parentElement, main];
  return {
    stage: stage === null ? null : { scroll: stage.scrollHeight, client: stage.clientHeight },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    overflow: owners.map((owner) => (owner ? getComputedStyle(owner).overflowY : "missing")),
    regions: Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, boxOf(selector)])),
  };
}

function expectIntact(facts: Facts): void {
  const { stage, regions } = facts;
  if (stage !== null) {
    expect(stage.scroll, "the stage must hold its own content").toBeLessThanOrEqual(stage.client + 1);
  }
  const shown = ORDER.flatMap((name) => {
    const box = regions[name];
    return box === null || box === undefined ? [] : [{ name, box }];
  }).sort((first, second) => first.box.top - second.box.top);
  for (let index = 1; index < shown.length; index += 1) {
    const before = shown[index - 1];
    const after = shown[index];
    if (before !== undefined && after !== undefined) {
      expect(after.box.top, `${after.name} must not overlap ${before.name}`).toBeGreaterThanOrEqual(
        before.box.bottom - 1,
      );
    }
  }
}

export async function expectLayoutIntact(page: Page): Promise<void> {
  expectIntact(await page.evaluate(collect, REGIONS));
}

export async function expectOneScreen(page: Page, expected: OneScreen): Promise<void> {
  const facts = await page.evaluate(collect, REGIONS);
  const { viewport, scroll, overflow, regions } = facts;
  const { tabBar = viewport.width < TAB_BAR_BELOW, reserve = 0, pager = expected.player } = expected;
  expectIntact(facts);

  expect(scroll.height, "the page must not scroll vertically").toBeLessThanOrEqual(viewport.height);
  expect(scroll.width, "the page must not scroll sideways").toBeLessThanOrEqual(viewport.width);
  expect(overflow, "no ancestor may hide overflow, or this check could never fail").not.toContain("hidden");
  expect(overflow).not.toContain("clip");

  const expectations: ReadonlyArray<readonly [string, boolean | "either", number]> = [
    ["header", expected.header, 0],
    ["pager", pager, 0],
    ["window", true, reserve],
    ["guide", expected.guide, reserve],
    ["footer", expected.player, reserve],
    ["tabBar", tabBar, 0],
  ];
  for (const [name, shown, bottomReserve] of expectations) {
    const box = regions[name];
    if (shown === "either" && box === null) {
      continue;
    }
    if (shown === false) {
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

const RESIZE_HANDLED = "__resizeHandled";

export async function resizeAndSettle(
  page: Page,
  size: { readonly width: number; readonly height: number },
): Promise<void> {
  await page.evaluate((key) => {
    Reflect.set(
      window,
      key,
      new Promise<void>((resolve) => {
        window.addEventListener("resize", () => requestAnimationFrame(() => requestAnimationFrame(() => resolve())), {
          once: true,
        });
      }),
    );
  }, RESIZE_HANDLED);
  await page.setViewportSize(size);
  await page.evaluate((key): Promise<void> => Reflect.get(window, key), RESIZE_HANDLED);
}

export async function openSoftKeyboard(page: Page, share: number): Promise<void> {
  const size = page.viewportSize();
  if (size === null) {
    throw new Error("the page has no viewport to shrink");
  }
  await surface(page).click();
  await resizeAndSettle(page, { width: size.width, height: Math.round(size.height * (1 - share)) });
}
