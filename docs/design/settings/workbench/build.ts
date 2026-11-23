import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { BOARDS, compactionBoard, groupingBoard, todayBoard } from "./candidates.ts";
import { board, page } from "./lib.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUND = resolve(HERE, "..", "round1");
const SCRATCH = process.argv[2] ?? ROUND;

const INTRO = `<div class="intro"><h1>Settings, round 1: ten different ideas</h1>
<p>Nothing here is a favourite. Each board shows one <b>structure</b> on phone and desktop, plus the Arabic right-to-left version. Every board uses the same 12 settings and 6 actions, the app's real wording and its real colours. Try them: segmented controls, switches, the font and size, tabs, folds and search all work.</p>
<p>Board <b>0</b> is today, measured. Board <b>K</b> shows space savers that combine with any structure. Board <b>L</b> shows three ways to group the same settings.</p>
<p>The numbers under each board are measured from these mock-ups: the height of the tallest pane, in screens, compared with today (2.8 on a phone, 2.9 on a desktop).</p></div>`;

function allBoards(images: boolean): string {
  const nav = [
    ["0", "Today"],
    ...BOARDS.map((b): [string, string] => [b.letter, b.title]),
    ["K", "Space savers"],
    ["L", "Groupings"],
  ]
    .map(([letter, title]) => `<a href="#${letter === "0" ? "T" : letter}"><b>${letter}</b>${title}</a>`)
    .join("");
  return `<div class="boardwrap"><div class="nav" style="position:static;padding:0 0 24px;width:auto;background:none;border:0">${nav}</div>${INTRO}${todayBoard(images)}${BOARDS.map((b) => board(b)).join("")}${compactionBoard()}${groupingBoard()}</div>`;
}

function inlineImages(html: string): string {
  return html.replace(/src="\.\.\/(today-[^"]+\.png)"/g, (_, file: string) => {
    const data = readFileSync(join(ROUND, "..", file)).toString("base64");
    return `src="data:image/png;base64,${data}"`;
  });
}

const FIT = `(function(){var w=document.querySelector('.boardwrap');function fit(){var s=Math.min(1,window.innerWidth/2180);w.style.zoom=s;}fit();window.addEventListener('resize',fit);})();`;

async function main(): Promise<void> {
  mkdirSync(ROUND, { recursive: true });
  const localFile = join(ROUND, "index.html");
  writeFileSync(localFile, page("Settings round 1", allBoards(true), "local"));

  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 2300, height: 1400 }, deviceScaleFactor: 1.5 });
  const tab = await context.newPage();
  await tab.addInitScript("window.__name = (target) => target;");
  await tab.goto(`file://${localFile}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(800);

  const metrics = await tab.evaluate(() => {
    document.body.classList.add("measure");
    const sync = (frame: HTMLElement): void => {
      const state = frame.dataset.state ?? "";
      for (const element of frame.querySelectorAll<HTMLElement>("[data-only]")) {
        element.hidden = !(element.dataset.only ?? "").split(" ").includes(state);
      }
    };
    const out: Record<string, number> = {};
    for (const frame of document.querySelectorAll<HTMLElement>("[data-frame][data-mid]")) {
      const mid = frame.dataset.mid ?? "";
      const phone = frame.classList.contains("phone");
      const original = frame.dataset.state ?? "";
      if (frame.classList.contains("pageframe")) {
        const main = frame.querySelector<HTMLElement>(".pagemain");
        const head = frame.querySelector<HTMLElement>(".apphead")?.offsetHeight ?? 0;
        const bar = frame.querySelector<HTMLElement>(".tabbar")?.offsetHeight ?? 0;
        out[mid] = ((main?.scrollHeight ?? 0) + head + bar) / (phone ? 844 : 900);
        continue;
      }
      const sheet = frame.querySelector<HTMLElement>(".sheet");
      if (sheet === null) {
        continue;
      }
      const states = (frame.dataset.states ?? "").split(" ");
      const keep = { height: sheet.style.height, maxHeight: sheet.style.maxHeight };
      let tallest = 0;
      for (const state of states) {
        frame.dataset.state = state;
        sync(frame);
        sheet.style.height = "fit-content";
        sheet.style.maxHeight = "none";
        tallest = Math.max(tallest, sheet.offsetHeight);
      }
      sheet.style.height = keep.height;
      sheet.style.maxHeight = keep.maxHeight;
      frame.dataset.state = original;
      sync(frame);
      out[mid] = tallest / (phone ? 758 : 808);
    }
    const heights: Record<string, number> = {};
    for (const body of document.querySelectorAll<HTMLElement>("[data-mh]")) {
      heights[body.dataset.mh ?? ""] = body.offsetHeight;
    }
    document.body.classList.remove("measure");
    for (const [mid, value] of Object.entries(out)) {
      for (const slot of document.querySelectorAll<HTMLElement>(`[data-metric="${mid}"]`)) {
        slot.textContent = value.toFixed(1);
      }
    }
    for (const [key, value] of Object.entries(heights)) {
      const slot = document.querySelector<HTMLElement>(`[data-mh-out="${key}"]`);
      const base = heights[key.replace("-after", "-before")];
      if (slot !== null) {
        slot.textContent =
          key.endsWith("-after") && base !== undefined ? `${value} (${Math.round(((base - value) / base) * 100)}% shorter)` : String(value);
      }
    }
    return { screens: out, heights };
  });
  writeFileSync(join(ROUND, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);

  const final = await tab.content();
  writeFileSync(localFile, final);

  for (const id of ["T", ...BOARDS.map((b) => b.id), "K", "L"]) {
    await tab.locator(`#${id}`).screenshot({ path: join(ROUND, `${id}.png`) });
  }
  await browser.close();

  const content = final.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  const body = inlineImages(content.replace(/<script>[\s\S]*?<\/script>/g, ""));
  writeFileSync(join(SCRATCH, "artifact.html"), page("Settings round 1", body, "google").replace("</body>", `<script>${FIT}</script></body>`));
  console.log(JSON.stringify(metrics.screens, null, 1));
}

main();
