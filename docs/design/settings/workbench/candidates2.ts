import { esc, type FrameSpec, frame, type Lang, type Kind } from "./lib.ts";
import { ALL2, GROUP_IDS, pushPeek, pushPinned, railBeside, railPinned, tabsInline, type PaneOverrides } from "./round2.ts";

type Build = FrameSpec["build"];

interface Design {
  readonly id: "D1" | "D2" | "D3";
  readonly letter: string;
  readonly title: string;
  readonly idea: string;
  readonly preview: string;
  readonly nav: string;
  readonly costs: string;
  readonly reach: string;
  readonly phone: Build;
  readonly tab: Build;
  readonly desk: Build;
  readonly firstState: string;
  readonly phoneStates: readonly string[];
}

const CHANGED = "size=7;font=Amiri;vocal=letters";

const d1: Design = {
  id: "D1",
  letter: "1",
  title: "Push list, preview pinned on top",
  idea: "Phone: a list of five groups, each with its current value; tapping one opens just that group. The Lesson group holds the live preview, pinned above its controls. Desktop and tablet: the same list is a rail, the preview is pinned above the controls.",
  preview: "Pinned full preview at the top of the Lesson section (the mistake behaviour is written under the sample). On a small or short screen it stops being pinned and scrolls with the controls.",
  nav: "Push navigation: list, then group. Back says “Settings”. The sheet keeps one height so it never jumps between screens.",
  costs: "On desktop the pinned preview plus the keyboard strip leaves less room for controls, so the Lesson pane scrolls a little.",
  reach: "2 actions to anything (group, then control).",
  phone: pushPinned(),
  tab: railPinned(),
  desk: railPinned(),
  firstState: "list",
  phoneStates: ALL2,
};

const d2: Design = {
  id: "D2",
  letter: "2",
  title: "Push list, slim preview on phone, preview beside on desktop",
  idea: "Same navigation as 1. The difference is where the preview lives. Phone: one slim sample line pinned (about 60 px), tap it to open the whole preview. Desktop: three columns, the rail, the controls, and a column that never moves holding the preview, the keyboard and the keyboard guide switches that control it.",
  preview: "Phone: a one-line peek that opens in place. Desktop: the preview column also holds the Keyboard guide switches, right under the keyboard they change, so the whole Lesson group fits with no scrolling. Tablet (touch, no keyboard guide) falls back to design 1.",
  nav: "Push navigation like design 1, same steady sheet height.",
  costs: "More to build (a collapsible peek and a third column) and a wider desktop dialog (1080 px).",
  reach: "2 actions to anything (group, then control).",
  phone: pushPeek(),
  tab: railPinned(),
  desk: railBeside(),
  firstState: "list",
  phoneStates: ALL2,
};

const d3: Design = {
  id: "D3",
  letter: "3",
  title: "Tabs on phone, rail on desktop, preview in the page",
  idea: "Phone: no list level. Five tabs sit under the title and Settings opens straight on Lesson, with the preview at the top of the pane (it scrolls away with the page). Desktop and tablet: the rail and pinned preview of design 1.",
  preview: "Preview is the first block of the Lesson pane and scrolls with it, so controls get the full height once you move past it.",
  nav: "Tabs: one tap to any group, always visible. Current values are not shown, and five tabs scroll sideways at 320 px with large text.",
  costs: "Group values (“Scheherazade New · 40”) are not visible until you open the group. Phone and desktop navigate differently.",
  reach: "1 action to any group, 2 to a control only if it is on another tab.",
  phone: tabsInline(),
  tab: railPinned(),
  desk: railPinned(),
  firstState: "lesson",
  phoneStates: GROUP_IDS,
};

export const DESIGNS: readonly Design[] = [d1, d2, d3];

const spec = (
  id: string,
  label: string,
  kind: Kind,
  lang: Lang,
  build: Build,
  state: string,
  states: readonly string[],
  init?: string,
): FrameSpec => ({ id, label, kind, lang, build, state, states, init });

export function designFrames(d: Design): readonly FrameSpec[] {
  const first = d.firstState;
  return [
    spec("phone", d.firstState === "list" ? "Phone: where Settings opens. Each group shows what it is set to." : "Phone: Settings opens on Lesson with the preview first.", "phone", "en", d.phone, first, d.phoneStates),
    spec("phone2", "Phone: Lesson with values changed (text size 64, Amiri, letters only). The preview follows.", "phone", "en", d.phone, "lesson", d.phoneStates, CHANGED),
    spec("phone3", "Phone: Recitation. Audio sits with it.", "phone", "en", d.phone, "recitation", d.phoneStates),
    spec("small", "320 px wide, text at 200%: Lesson. The preview is not pinned here, it scrolls.", "small", "en", d.phone, "lesson", d.phoneStates),
    spec("tab", "Tablet 820 x 1180 (touch, so no keyboard guide): Lesson.", "tab", "en", d.tab, "lesson", GROUP_IDS),
    spec("desk", "Desktop 1440 x 900: Lesson, with the keyboard guide and the keyboard in the preview.", "desk", "en", d.desk, "lesson", GROUP_IDS),
    spec("arList", d.firstState === "list" ? "Arabic: the list." : "Arabic: Lesson.", "phone", "ar", d.phone, first, d.phoneStates),
    spec("arLesson", "Arabic: Lesson, values changed.", "phone", "ar", d.phone, "lesson", d.phoneStates, CHANGED),
    spec("arDesk", "Arabic desktop: Lesson.", "desk", "ar", d.desk, "lesson", GROUP_IDS),
  ];
}

export function designBoard(d: Design): string {
  const frames = designFrames(d)
    .map((s) => frame(s, d.id))
    .join("");
  return `<article class="board" id="${d.id}"><header class="bh"><span class="badge">${d.letter}</span><div><h2>${esc(d.title)}</h2><p>${esc(d.idea)}</p></div></header><div class="frames">${frames}</div><div class="facts targets"><dl>
<div><dt>The preview</dt><dd>${esc(d.preview)}</dd></div>
<div><dt>Navigation</dt><dd>${esc(d.nav)}</dd></div>
<div><dt>Reach</dt><dd>${esc(d.reach)}</dd></div>
<div><dt>Tallest pane, measured</dt><dd>Phone (target 1.5 or less): <b data-metric="${d.id}-phone" data-limit="1.5">…</b> screens<br>Tablet: <b data-metric="${d.id}-tab" data-limit="1.5">…</b> screens<br>Desktop (target 1.0 or less): <b data-metric="${d.id}-desk" data-limit="1.0">…</b> screens</dd></div>
<div class="worst"><dt>Costs</dt><dd>${esc(d.costs)}</dd></div>
</dl></div></article>`;
}

export function compareBoard(): string {
  const rows = DESIGNS.map((d) => {
    const frames = designFrames(d).filter((s) => s.id === "phone2" || s.id === "desk");
    return `<section class="cmprow"><div class="cmptext"><span class="badge">${d.letter}</span><div><h3>${esc(d.title)}</h3><p>${esc(d.idea)}</p></div></div><div class="frames">${frames.map((s) => frame(s, `CMP-${d.id}`)).join("")}</div></section>`;
  }).join("");
  return `<article class="board" id="CMP"><header class="bh"><span class="badge">≡</span><div><h2>The three finals side by side</h2><p>Each shows the Lesson section with values changed (phone) and on a desktop. Everything else is the same in all three: the five groups, the controls in each, the wording, the confirmations.</p></div></header>${rows}</article>`;
}

const S = (id: string, label: string, state: string, overrides: PaneOverrides, init?: string): FrameSpec => ({
  id,
  label,
  kind: "phone",
  lang: "en",
  build: pushPinned(overrides),
  state,
  states: [state],
  init,
});

export function statesBoard(): string {
  const specs: readonly FrameSpec[] = [
    S("s1", "Your data: a backup file was chosen. Focus lands on “Keep my progress”, the safe answer.", "data", { data: { variant: "confirm", scenario: "restore" } }),
    S("s2", "Your data: the chosen file is not a backup. The message is read out and stays until the next try.", "data", { data: { variant: "error", scenario: "restore" } }),
    S("s3", "Your data: Reset progress asks first. Settings and your place in the Qur'an are kept, and it says so.", "data", { data: { variant: "confirm", scenario: "reset" } }),
    S("s4", "Your data: after a reset, the result is stated. Focus goes back to the button.", "data", { data: { variant: "done", scenario: "reset" } }),
    S("s5", "Practice: unlocking all letters asks first. It is not red, because it can be undone by Reset.", "practice", { practice: "confirm" }),
    S("s6", "Practice: everything unlocked. The button is disabled (still focusable) and the status is stated.", "practice", { practice: "done" }),
    S("s7", "Recitation: no saved audio yet, then the confirmation after deleting it.", "recitation", { recitation: "deleted" }),
    S("s8", "Keyboard focus is visible on every control. Here, “Restore from a backup file”.", "data", { data: { variant: "ring", scenario: "none" } }),
    {
      id: "s9",
      label: "Desktop: with the keyboard and finger guide switched off, the preview drops them.",
      kind: "desk",
      lang: "en",
      build: railBeside(),
      state: "lesson",
      states: ["lesson"],
      init: "kbd=off;finger=off",
    },
  ];
  return `<article class="board" id="STATES"><header class="bh"><span class="badge">!</span><div><h2>States that decide whether it works</h2><p>These panes are the same in all three designs; only the container around them changes. Shown inside design 1's phone sheet.</p></div></header><div class="frames">${specs.map((s) => frame(s, "STATES")).join("")}</div></article>`;
}
