import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { compareBoard, DESIGNS, designBoard, statesBoard } from "./candidates2.ts";
import { page } from "./lib.ts";
import { CSS2 } from "./round2.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUND = resolve(HERE, "..", "round2");
const SCRATCH = process.argv[2] ?? ROUND;

const INTRO = `<div class="intro"><h1>Settings, round 2: three designs to choose between</h1>
<p>You chose <b>master and detail</b>, kept <b>Settings as a dialog over the lesson</b>, and asked for the <b>live preview in one section</b> with every setting that changes it. All three designs below do exactly that. They share one set of five groups: <b>General, Lesson, Recitation, Practice, Your data</b>. Audio is in Recitation, “Unlock all letters” is in Practice, and Lesson holds the preview with the font, text size, vocalization, Backspace correction and keyboard guide.</p>
<p>They differ in two things you can mix and match afterwards: <b>how the preview sits</b> (pinned, slim and expandable, or in a column of its own) and <b>how the phone navigates</b> (push list or tabs). Everything is clickable and measured.</p>
<div class="legend"><span><b>Green</b> = meets the target you confirmed</span><span><b>Red</b> = misses it</span><span>Phone target: 1.5 screens or less. Desktop target: 1.0 or less.</span></div></div>`;

function content(): string {
  const nav = [
    ["≡", "CMP", "Side by side"],
    ...DESIGNS.map((d): [string, string, string] => [d.letter, d.id, d.title]),
    ["!", "STATES", "States"],
  ]
    .map(([letter, id, title]) => `<a href="#${id}">${letter} ${title}</a>`)
    .join(" · ");
  return `<div class="boardwrap"><div style="padding:0 0 24px;color:var(--muted);font-size:15px">${nav}</div>${INTRO}${compareBoard()}${DESIGNS.map((d) => designBoard(d)).join("")}${statesBoard()}</div>`;
}

const FIT = `(function(){var w=document.querySelector('.boardwrap');function fit(){w.style.zoom=Math.min(1,window.innerWidth/2180);}fit();window.addEventListener('resize',fit);})();`;

async function main(): Promise<void> {
  mkdirSync(ROUND, { recursive: true });
  const localFile = join(ROUND, "index.html");
  writeFileSync(localFile, page("Settings round 2", content(), "local", CSS2));

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
  for (const id of ["CMP", ...DESIGNS.map((d) => d.id), "STATES"]) {
    await tab.locator(`#${id}`).screenshot({ path: join(ROUND, `${id}.png`) });
  }
  await browser.close();

  const body = final.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  const bare = body.replace(/<script>[\s\S]*?<\/script>/g, "");
  const online = page("Settings round 2", bare, "google", CSS2);
  const style = online.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const link = online.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)?.[0] ?? "";
  const script = online.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  writeFileSync(
    join(SCRATCH, "artifact2.html"),
    `<title>Settings round 2</title>${link}<style>:root{color-scheme:dark}${style}</style>${bare}<script>${script}</script><script>${FIT}</script>`,
  );
  console.log(JSON.stringify(metrics, null, 1));
}

main();
