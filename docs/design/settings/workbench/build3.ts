import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { CSS3, finalBoard, truthBoard, unlockBoard } from "./final.ts";
import { page } from "./lib.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUND = resolve(HERE, "..", "round3");
const SCRATCH = process.argv[2] ?? ROUND;

const INTRO = `<div class="intro"><h1>Settings, final design</h1>
<p>Decisions applied: <b>design 2</b> for phone and desktop, a <b>push list</b> on phone with the active section's title <b>centred</b> in the dialog, <b>General first</b>, and <b>“Unlock all letters” moved out of Settings</b>. That leaves four groups: General, Lesson, Recitation, Your data.</p>
<p>Because the preview must be truthful, the second board explains how it is built so that it cannot drift from the real lesson. The third board shows where “Unlock all letters” goes, on screenshots of the real app.</p>
<div class="legend"><span><b>Green</b> = meets your target</span><span>Phone: 1.5 screens or less. Desktop: 1.0 or less.</span></div></div>`;

function content(): string {
  return `<div class="boardwrap"><div style="padding:0 0 24px;color:var(--muted);font-size:15px"><a href="#FINAL">F The final design</a> · <a href="#TRUTH">= Truthful preview</a> · <a href="#UNLOCK">Unlock all letters</a></div>${INTRO}${finalBoard()}${truthBoard()}${unlockBoard()}</div>`;
}

const FIT = `(function(){var w=document.querySelector('.boardwrap');function fit(){w.style.zoom=Math.min(1,window.innerWidth/2180);}fit();window.addEventListener('resize',fit);})();`;

async function main(): Promise<void> {
  mkdirSync(ROUND, { recursive: true });
  const localFile = join(ROUND, "index.html");
  writeFileSync(localFile, page("Settings final design", content(), "local", CSS3));

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
    const budgets: Record<string, number> = { phone: 758, small: 511, desk: 808, tab: 1062 };
    const out: Record<string, number> = {};
    for (const frame of document.querySelectorAll<HTMLElement>("[data-frame][data-mid]")) {
      const mid = frame.dataset.mid ?? "";
      const kind = ["phone", "small", "desk", "tab"].find((name) => frame.classList.contains(name)) ?? "phone";
      const sheet = frame.querySelector<HTMLElement>(".sheet");
      if (sheet === null) {
        continue;
      }
      const original = frame.dataset.state ?? "";
      const keep = { height: sheet.style.height, maxHeight: sheet.style.maxHeight };
      let tallest = 0;
      for (const state of (frame.dataset.states ?? "").split(" ")) {
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
      out[mid] = tallest / (budgets[kind] ?? 758);
    }
    document.body.classList.remove("measure");
    for (const slot of document.querySelectorAll<HTMLElement>("[data-metric]")) {
      const value = out[slot.dataset.metric ?? ""];
      if (value === undefined) {
        continue;
      }
      slot.textContent = value.toFixed(2);
      const limit = Number(slot.dataset.limit ?? "0");
      slot.classList.add(value <= limit ? "pass" : "fail");
    }
    return out;
  });
  writeFileSync(join(ROUND, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);

  const final = await tab.content();
  writeFileSync(localFile, final);
  for (const id of ["FINAL", "TRUTH", "UNLOCK"]) {
    await tab.locator(`#${id}`).screenshot({ path: join(ROUND, `${id}.png`) });
  }
  await browser.close();

  const body = final.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  const stripped = body.replace(/<script>[\s\S]*?<\/script>/g, "");
  const bare = stripped.replace(/src="real\/([^"]+\.png)"/g, (_, file: string) => `src="data:image/png;base64,${readFileSync(join(ROUND, "real", file)).toString("base64")}"`);
  const online = page("Settings final design", bare, "google", CSS3);
  const style = online.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const link = online.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)?.[0] ?? "";
  const script = online.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  writeFileSync(
    join(SCRATCH, "artifact3.html"),
    `<title>Settings final design</title>${link}<style>:root{color-scheme:dark}${style}</style>${bare}<script>${script}</script><script>${FIT}</script>`,
  );
  console.log(JSON.stringify(metrics, null, 1));
}

main();
