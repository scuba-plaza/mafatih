import { expect, type Page, test } from "@playwright/test";
import { type Language, openAndWait, PAGES, seedTypicalProfile } from "./helpers/pages.ts";

const MOST_TAB_PRESSES = 250;
const MIN_RING_CONTRAST = 3;
const SAME_ROW_TOLERANCE = 4;
const SETTINGS_NAME = { en: "Settings", ar: "الإعدادات" } as const;

interface Stop {
  readonly id: number;
  readonly label: string;
  readonly contrast: number;
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly inDialog: boolean;
  readonly direction: string;
}

type Reading =
  | { readonly kind: "stop"; readonly stop: Stop }
  | { readonly kind: "left" }
  | { readonly kind: "dialog" }
  | { readonly kind: "repeat"; readonly id: number; readonly label: string };

interface Toolkit {
  readonly reset: () => void;
  readonly read: () => Reading;
  readonly unreached: (inDialog: boolean) => string[];
}

interface Walk {
  readonly stops: Stop[];
  readonly ended: "left the page" | "came round" | "trapped" | "never ended";
  readonly trappedAt: string;
}

function installToolkit(): void {
  const ids = new WeakMap<Element, number>();
  const seen = new Set<number>();
  const walked = new Set<number>();
  const baseline = new Map<Element, string>();
  let counter = 0;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("a canvas is needed to resolve colours");
  }

  const idOf = (element: Element): number => {
    let id = ids.get(element);
    if (id === undefined) {
      counter += 1;
      id = counter;
      ids.set(element, id);
    }
    return id;
  };

  const rgba = (css: string): [number, number, number, number] => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, (data[3] ?? 0) / 255];
  };

  const luminance = (colour: readonly number[]): number => {
    const channel = (value: number): number => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(colour[0] ?? 0) + 0.7152 * channel(colour[1] ?? 0) + 0.0722 * channel(colour[2] ?? 0);
  };

  const contrastOf = (first: readonly number[], second: readonly number[]): number => {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  const backdrop = (start: Element | null): [number, number, number] => {
    const layers: [number, number, number, number][] = [];
    for (let node = start; node !== null; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour[3] > 0) {
        layers.push(colour);
        if (colour[3] >= 1) {
          break;
        }
      }
    }
    let base: [number, number, number] = [255, 255, 255];
    for (const [r, g, b, a] of layers.reverse()) {
      base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)];
    }
    return base;
  };

  const stateOf = (node: Element): string => {
    const style = getComputedStyle(node);
    return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow].join("|");
  };

  const splitShadows = (value: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of value) {
      if (char === "(") {
        depth += 1;
      }
      if (char === ")") {
        depth -= 1;
      }
      if (char === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim() !== "") {
      parts.push(current.trim());
    }
    return parts;
  };

  const ringColours = (node: Element): string[] => {
    const style = getComputedStyle(node);
    const colours: string[] = [];
    if (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) {
      colours.push(style.outlineColor);
    }
    if (style.boxShadow !== "none") {
      for (const shadow of splitShadows(style.boxShadow)) {
        if (shadow.includes("inset")) {
          continue;
        }
        const lengths = [...shadow.matchAll(/(-?[\d.]+)px/g)].map((match) => Number(match[1]));
        if ((lengths[3] ?? 0) >= 1) {
          colours.push(shadow.replace(/(-?[\d.]+)px/g, "").trim());
        }
      }
    }
    return colours;
  };

  const hostsOf = (element: Element): Element[] => {
    const hosts = new Set<Element>([element]);
    let ancestor = element.parentElement;
    for (let depth = 0; ancestor !== null && depth < 3; depth += 1) {
      hosts.add(ancestor);
      ancestor = ancestor.parentElement;
    }
    for (const sibling of element.parentElement?.children ?? []) {
      hosts.add(sibling);
    }
    return [...hosts];
  };

  const ringContrast = (element: Element): number => {
    let best = 0;
    for (const host of hostsOf(element)) {
      if (baseline.get(host) === stateOf(host)) {
        continue;
      }
      const background = backdrop(host.parentElement);
      for (const css of ringColours(host)) {
        const [r, g, b, a] = rgba(css);
        const ring = [
          r * a + background[0] * (1 - a),
          g * a + background[1] * (1 - a),
          b * a + background[2] * (1 - a),
        ];
        best = Math.max(best, contrastOf(ring, background));
      }
    }
    return best;
  };

  const labelOf = (element: Element): string => {
    const named = element.getAttribute("aria-label") ?? (element as HTMLInputElement).labels?.[0]?.textContent;
    return `${element.tagName.toLowerCase()} ${(named ?? element.textContent ?? "").trim().slice(0, 40)}`;
  };

  const shown = (element: HTMLElement): boolean =>
    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";

  const isTypingInput = (element: HTMLElement): boolean =>
    element instanceof HTMLInputElement &&
    (element.closest("section")?.querySelector("[data-lesson-text]") ?? null) !== null;

  for (const element of document.querySelectorAll("*")) {
    baseline.set(element, stateOf(element));
  }
  if (document.activeElement !== null) {
    for (const host of hostsOf(document.activeElement)) {
      baseline.delete(host);
    }
  }

  const toolkit: Toolkit = {
    reset: () => {
      seen.clear();
    },
    read: () => {
      const element = document.activeElement;
      if (element === null || element === document.body || element === document.documentElement) {
        return { kind: "left" };
      }
      if (element instanceof HTMLDialogElement) {
        return { kind: "dialog" };
      }
      const id = idOf(element);
      const label = labelOf(element);
      if (seen.has(id)) {
        return { kind: "repeat", id, label };
      }
      seen.add(id);
      walked.add(id);
      const box = element.getBoundingClientRect();
      let scrolled = 0;
      for (let node = element.parentElement; node !== null; node = node.parentElement) {
        scrolled += node.scrollTop;
      }
      return {
        kind: "stop",
        stop: {
          id,
          label,
          contrast: ringContrast(element),
          top: box.top + scrolled,
          bottom: box.bottom + scrolled,
          left: box.left + window.scrollX,
          right: box.right + window.scrollX,
          inDialog: document.querySelector("dialog[open]")?.contains(element) ?? false,
          direction: getComputedStyle(element.parentElement ?? element).direction,
        },
      };
    },
    unreached: (inDialog) => {
      const root = inDialog ? document.querySelector("dialog[open]") : document;
      const candidates = [
        ...(root?.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex="0"]') ?? []),
      ].filter(
        (element) =>
          shown(element) &&
          !("disabled" in element && element.disabled === true) &&
          !element.closest("[inert]") &&
          !isTypingInput(element),
      );
      const checkedGroups = new Set(
        candidates
          .filter((element) => element instanceof HTMLInputElement && element.type === "radio" && element.checked)
          .map((element) => (element as HTMLInputElement).name),
      );
      return candidates
        .filter(
          (element) =>
            !(
              element instanceof HTMLInputElement &&
              element.type === "radio" &&
              !element.checked &&
              checkedGroups.has(element.name)
            ),
        )
        .filter((element) => !walked.has(idOf(element)))
        .map((element) => `${labelOf(element)} (tabindex ${element.tabIndex})`);
    },
  };
  Object.assign(window, { mafatihWalk: toolkit });
}

async function prepareAtTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.evaluate(installToolkit);
}

async function walk(page: Page, key: "Tab" | "Shift+Tab", startAtFocus: boolean): Promise<Walk> {
  await page.evaluate(() => (window as unknown as { mafatihWalk: Toolkit }).mafatihWalk.reset());
  const stops: Stop[] = [];
  let ended: Walk["ended"] = "never ended";
  let trappedAt = "";
  const take = async (): Promise<void> => {
    const reading = await page.evaluate(() => (window as unknown as { mafatihWalk: Toolkit }).mafatihWalk.read());
    if (reading.kind === "left") {
      ended = "left the page";
    } else if (reading.kind === "dialog") {
      return;
    } else if (reading.kind === "repeat") {
      ended = reading.id === stops[0]?.id ? "came round" : "trapped";
      trappedAt = reading.label;
    } else {
      stops.push(reading.stop);
    }
  };
  if (startAtFocus) {
    await take();
  }
  for (let press = 0; press < MOST_TAB_PRESSES && ended === "never ended"; press += 1) {
    await page.keyboard.press(key);
    await take();
  }
  return { stops, ended, trappedAt };
}

function orderViolations(stops: readonly Stop[]): string[] {
  const violations: string[] = [];
  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    if (from === undefined || to === undefined) {
      continue;
    }
    const down = to.top >= from.bottom - SAME_ROW_TOLERANCE;
    const up = to.bottom <= from.top + SAME_ROW_TOLERANCE;
    const along =
      to.direction === "rtl" ? to.right <= from.right + SAME_ROW_TOLERANCE : to.left >= from.left - SAME_ROW_TOLERANCE;
    if (!down && (up || !along)) {
      violations.push(`${from.label} -> ${to.label}`);
    }
  }
  return violations;
}

async function expectCompleteWalk(page: Page, scope: "page" | "dialog"): Promise<void> {
  const inDialog = scope === "dialog";
  const forward = await walk(page, "Tab", inDialog);
  expect(forward.ended, `Tab must leave the page or come round, never trap (stuck at ${forward.trappedAt})`).toMatch(
    /left the page|came round/,
  );
  expect(forward.stops.length).toBeGreaterThanOrEqual(4);
  expect(
    forward.stops.filter((stop) => stop.contrast < MIN_RING_CONTRAST).map((stop) => `${stop.label} ${stop.contrast}`),
    "every stop shows a ring that appears with focus and has 3:1 against its surroundings",
  ).toEqual([]);
  const unreached = await page.evaluate(
    (dialogOpen) => (window as unknown as { mafatihWalk: Toolkit }).mafatihWalk.unreached(dialogOpen),
    inDialog,
  );
  expect(unreached).toEqual([]);
  expect(orderViolations(forward.stops)).toEqual([]);
  if (inDialog) {
    expect(forward.stops.filter((stop) => !stop.inDialog).map((stop) => stop.label)).toEqual([]);
  }
  const backward = await walk(page, "Shift+Tab", false);
  expect(backward.ended, `Shift+Tab must leave the page or come round (stuck at ${backward.trappedAt})`).toMatch(
    /left the page|came round/,
  );
  expect(backward.stops.map((stop) => stop.label)).toEqual(forward.stops.map((stop) => stop.label).reverse());
  expect(backward.stops.map((stop) => stop.id)).toEqual(forward.stops.map((stop) => stop.id).reverse());
}

for (const language of ["en", "ar"] as const satisfies readonly Language[]) {
  for (const { name, hash, typing } of PAGES) {
    test(`${language}: Tab alone reaches every control of the ${name} page in reading order, with a visible ring, never traps, and Shift+Tab retraces it`, async ({
      page,
    }) => {
      await seedTypicalProfile(page, language);
      await openAndWait(page, hash, typing);
      await prepareAtTop(page);
      await expectCompleteWalk(page, "page");
    });
  }

  test(`${language}: Tab stays inside the Settings dialog, reaches every control with a visible ring, and Escape returns to the opener`, async ({
    page,
  }) => {
    await seedTypicalProfile(page, language);
    await openAndWait(page, "#/custom", true);
    const opener = page.getByRole("button", { name: SETTINGS_NAME[language] });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: SETTINGS_NAME[language] });
    await expect(dialog).toBeVisible();
    await page.evaluate(installToolkit);
    await expectCompleteWalk(page, "dialog");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
