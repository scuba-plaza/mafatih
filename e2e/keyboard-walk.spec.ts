import { expect, type Page, test } from "@playwright/test";
import { type Language, openAndWait, PAGES, seedTypicalProfile } from "./helpers/pages.ts";

const MOST_TAB_PRESSES = 250;

interface Stop {
  readonly label: string;
  readonly ring: boolean;
}

interface Walk {
  readonly stops: Stop[];
  readonly ended: "left the page" | "came round" | "never ended";
  readonly unreached: string[];
}

async function startFromTheTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
    Object.assign(window, { walked: new Set<Element>() });
  });
}

async function stopAfterTab(page: Page): Promise<Stop | "left the page" | "came round"> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (element === null || element === document.body) {
      return "left the page" as const;
    }
    const walked = (window as unknown as { walked: Set<Element> }).walked;
    if (walked.has(element)) {
      return "came round" as const;
    }
    walked.add(element);
    const hasRing = (node: Element): boolean => {
      const style = getComputedStyle(node);
      return (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
    };
    let ring = false;
    for (let node: Element | null = element, depth = 0; node !== null && depth < 4; node = node.parentElement) {
      ring = ring || hasRing(node);
      depth += 1;
    }
    const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40) ?? element.tagName;
    return { label: `${element.tagName.toLowerCase()} ${label}`, ring };
  });
}

async function unreachedControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const walked = (window as unknown as { walked: Set<Element> }).walked;
    const shown = (element: HTMLElement): boolean =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
    const candidates = [
      ...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex="0"]'),
    ].filter(
      (element) => shown(element) && element.tabIndex >= 0 && !("disabled" in element && element.disabled === true),
    );
    const checkedGroups = new Set(
      candidates
        .filter((element) => element instanceof HTMLInputElement && element.type === "radio" && element.checked)
        .map((element) => (element as HTMLInputElement).name),
    );
    return candidates
      .filter((element) => {
        const radio = element instanceof HTMLInputElement && element.type === "radio";
        return !(
          radio &&
          !(element as HTMLInputElement).checked &&
          checkedGroups.has((element as HTMLInputElement).name)
        );
      })
      .filter((element) => !walked.has(element))
      .map(
        (element) =>
          `${element.tagName.toLowerCase()} ${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40)}`,
      );
  });
}

async function walk(page: Page): Promise<Walk> {
  await startFromTheTop(page);
  const stops: Stop[] = [];
  let ended: Walk["ended"] = "never ended";
  for (let press = 0; press < MOST_TAB_PRESSES && ended === "never ended"; press += 1) {
    await page.keyboard.press("Tab");
    const stop = await stopAfterTab(page);
    if (stop === "left the page" || stop === "came round") {
      ended = stop;
    } else {
      stops.push(stop);
    }
  }
  return { stops, ended, unreached: await unreachedControls(page) };
}

for (const language of ["en", "ar"] as const satisfies readonly Language[]) {
  for (const { name, hash, typing } of PAGES) {
    test(`${language}: Tab alone reaches every control of the ${name} page, each with a visible focus ring, and ends`, async ({
      page,
    }) => {
      await seedTypicalProfile(page, language);
      await openAndWait(page, hash, typing);
      const result = await walk(page);
      expect(result.ended, "Tab must leave the page or come round, never trap").not.toBe("never ended");
      expect(result.stops.length).toBeGreaterThanOrEqual(4);
      expect(result.stops.filter((stop) => !stop.ring).map((stop) => stop.label)).toEqual([]);
      expect(result.unreached).toEqual([]);
    });
  }
}
