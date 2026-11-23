import {
  aboutLink,
  ayatSeg,
  type Ctx,
  chev,
  esc,
  fontChips,
  type FrameSpec,
  frame,
  languageSeg,
  orderSeg,
  reciterSeg,
  slider,
  sw,
  seg,
  backspaceSwitch,
} from "./lib.ts";

type GId = "general" | "lesson" | "recitation" | "data";

const M3 = {
  gGeneral: { en: "General", ar: "عام" },
  gLesson: { en: "Lesson", ar: "الدرس" },
  gRecitation: { en: "Recitation", ar: "التلاوة" },
  gData: { en: "Your data", ar: "بياناتك" },
  subText: { en: "Text", ar: "النص" },
  subTyping: { en: "Typing", ar: "الكتابة" },
  subGuide: { en: "Keyboard guide", ar: "دليل لوحة المفاتيح" },
  subBackup: { en: "Backup and restore", ar: "النسخ الاحتياطي والاستعادة" },
  preview: { en: "Preview", ar: "معاينة" },
  shownAt: { en: "Shown at 60%", ar: "بحجم ٦٠٪" },
  ayat: { en: "ayat", ar: "آيات" },
  dataSummary: { en: "Backup, restore, reset", ar: "نسخ، استعادة، إعادة ضبط" },
  back: { en: "Settings", ar: "الإعدادات" },
  tabsLabel: { en: "Settings groups", ar: "مجموعات الإعدادات" },
} as const satisfies Record<string, { readonly en: string; readonly ar: string }>;

const m3 = (ctx: Ctx, key: keyof typeof M3): string => esc(M3[key][ctx.lang]);
const bdi = (text: string): string => `<bdi>${text}</bdi>`;
const hasGuide = (ctx: Ctx): boolean => ctx.kind === "desk";

const MARKS = /([ً-ْ])/g;
const TANWEEN = /[ً-ٍ]/;
const mk = (text: string): string =>
  text.replace(MARKS, (mark) => `<span class="mk${TANWEEN.test(mark) ? " t" : ""}">${mark}</span>`);

function surface(ctx: Ctx, rows: number): string {
  const done = mk("كِتَابٌ ");
  const upcoming = mk("جَدِيدٌ عَلَى الطَّاوِلَةِ وَالقَلَمُ بِجَانِبِهِ");
  return `<div class="lt-wrap" style="--rows:${rows}"><div class="lt" lang="ar" dir="rtl"><p><span class="done">${done}</span><span class="mis bson">ب</span><span class="caret"></span>${upcoming}</p></div></div>`;
}

const KEY_ROWS: readonly { readonly lead: number; readonly keys: readonly (readonly [string, number])[] }[] = [
  { lead: 0, keys: [..."ذ1234567890-=".split("").map((k): [string, number] => [k, 1]), ["⌫", 2]] },
  { lead: 1.5, keys: [..."ضصثقفغعهخحجد".split("").map((k): [string, number] => [k, 1]), ["\\", 1.5]] },
  { lead: 1.75, keys: [..."شسيبلاتنمكط".split("").map((k): [string, number] => [k, 1]), ["↵", 2.25]] },
  { lead: 0, keys: [["⇧", 2.25], ...["ئ", "ء", "ؤ", "ر", "لا", "ى", "ة", "و", "ز", "ظ"].map((k): [string, number] => [k, 1]), ["⇧", 2.75]] },
  { lead: 4.5, keys: [["Arabic (101)", 6]] },
];

function guideKeyboard(ctx: Ctx): string {
  const rows = KEY_ROWS.map(
    (row) =>
      `<div class="gk-row" style="padding-inline-start:${row.lead * 44}px">${row.keys
        .map(([glyph, units]) => `<span class="gk${glyph === "ج" ? " hot" : ""}" style="width:${units * 44 - 4}px"><span class="g">${glyph}</span></span>`)
        .join("")}</div>`,
  ).join("");
  return `<div class="gk-board" dir="ltr">${rows}<div class="gk-hint">${ctx.t("finger.rightPinky")}</div></div>`;
}

function previewPanel(ctx: Ctx, o: { rows: number; keyboard: boolean; zoom?: number; open?: boolean }): string {
  const zoom = o.zoom === undefined ? "" : `zoom:${o.zoom};`;
  const tag = o.zoom === undefined ? "" : `<span class="shownat">${m3(ctx, "shownAt")}</span>`;
  return `<div class="tp"><div class="tp-label"><span>${m3(ctx, "preview")}</span>${tag}</div><div class="tp-box" style="${zoom}">${surface(ctx, o.rows)}${o.keyboard ? guideKeyboard(ctx) : ""}</div></div>`;
}

function peek(ctx: Ctx, open: boolean): string {
  return `<details class="peek3"${open ? " open" : ""}><summary><span class="peekl">${m3(ctx, "preview")}</span><span class="pv-c">${surface(ctx, 1)}</span>${chev()}</summary><div class="pv-o">${surface(ctx, 3)}</div></details>`;
}

function sub(title: string, body: string): string {
  return `<section class="sec"><h3 class="sh">${title}</h3><div class="stack">${body}</div></section>`;
}

function guideSwitches(ctx: Ctx): string {
  return `<div class="swlist">${sw({ label: ctx.t("settings.showKeyboard"), flag: "kbd" })}${sw({ label: ctx.t("settings.fingerGuide"), flag: "finger" })}${sw({ label: ctx.t("settings.keyLabels"), flag: "labels" })}${sw({ label: ctx.t("settings.delayedHint"), hint: ctx.t("settings.delayedHintHint", { seconds: ctx.n(3) }), checked: false })}</div><p class="hint">${ctx.t("settings.layoutHint", { layout: ctx.t("guide.layout") })}</p>`;
}

function vocalSeg(ctx: Ctx): string {
  const hints = { auto: "", letters: ctx.t("vocalization.lettersHint"), harakat: ctx.t("vocalization.harakatHint"), full: ctx.t("vocalization.fullHint") } as const;
  return seg(ctx, {
    legend: ctx.t("settings.vocalization"),
    value: "auto",
    hints: true,
    options: (["auto", "letters", "harakat", "full"] as const).map((key) => ({
      value: key,
      label: ctx.t(`vocalization.${key}`),
      hint: hints[key],
      attrs: `data-pv-vocal data-vocal="${key}"`,
    })),
  });
}

function lessonControls(ctx: Ctx): string {
  return `${sub(m3(ctx, "subText"), `${fontChips(ctx)}${slider(ctx)}`)}${sub(m3(ctx, "subTyping"), `${vocalSeg(ctx)}${backspaceSwitch(ctx)}`)}`;
}

function confirmFree(): string {
  return "";
}

function recitationBody(ctx: Ctx): string {
  const usage = ctx.t("audio.usage", { files: ctx.n(12), size: `${ctx.n(3.4)} MB` });
  const cache = `<div class="set"><p class="hint">${usage}</p><div class="btnrow"><button class="btn small" type="button">${ctx.t("audio.delete")}</button></div></div>`;
  return `${ayatSeg(ctx)}${orderSeg(ctx)}${reciterSeg(ctx)}${cache}${confirmFree()}`;
}

function dataBody(ctx: Ctx): string {
  const backup = `<p class="hint">${ctx.t("backup.hint")}</p><div class="btnrow"><button class="btn" type="button">${ctx.t("backup.download")}</button><button class="btn" type="button">${ctx.t("backup.choose")}</button></div>`;
  const reset = `<p class="hint">${ctx.t("settings.resetWarning")}</p><div class="btnrow"><button type="button" class="btn danger">${ctx.t("settings.reset")}</button></div>`;
  return `${sub(m3(ctx, "subBackup"), backup)}${sub(ctx.t("settings.reset"), reset)}`;
}

interface G3 {
  readonly id: GId;
  title(ctx: Ctx): string;
  summary(ctx: Ctx): string;
}

const GROUPS3: readonly G3[] = [
  { id: "general", title: (c) => m3(c, "gGeneral"), summary: (c) => (c.lang === "ar" ? "العربية" : "English") },
  { id: "lesson", title: (c) => m3(c, "gLesson"), summary: (c) => `${bdi("Scheherazade New")} · ${c.n(40)}` },
  { id: "recitation", title: (c) => m3(c, "gRecitation"), summary: (c) => `${c.t("reciter.murattal")} · ${c.n(4)} ${m3(c, "ayat")}` },
  { id: "data", title: (c) => m3(c, "gData"), summary: (c) => m3(c, "dataSummary") },
];

export const IDS3: readonly string[] = GROUPS3.map((g) => g.id);
export const ALL3: readonly string[] = ["list", ...IDS3];

function body(ctx: Ctx, id: GId, lead: string): string {
  switch (id) {
    case "general":
      return `${languageSeg(ctx)}${aboutLink(ctx)}`;
    case "lesson":
      return `${lead}${lessonControls(ctx)}`;
    case "recitation":
      return recitationBody(ctx);
    case "data":
      return dataBody(ctx);
  }
}

function panels(ctx: Ctx, lead: string, heading: boolean): string {
  return GROUPS3.map(
    (g) => `<div class="stack" data-only="${g.id}">${heading ? `<h3 class="sr">${g.title(ctx)}</h3>` : ""}${body(ctx, g.id, lead)}</div>`,
  ).join("");
}

function listRows(ctx: Ctx): string {
  return `<div class="vrows" data-only="list">${GROUPS3.map(
    (g) => `<button type="button" class="vrow" data-go="${g.id}" data-top><span class="l">${g.title(ctx)}</span><span class="v">${g.summary(ctx)}</span>${chev()}</button>`,
  ).join("")}</div>`;
}

function rail(ctx: Ctx): string {
  return `<nav class="rail" aria-label="${m3(ctx, "tabsLabel")}">${GROUPS3.map(
    (g) => `<button type="button" data-go="${g.id}" data-on="${g.id}"><b>${g.title(ctx)}</b><small>${g.summary(ctx)}</small></button>`,
  ).join("")}</nav>`;
}

function phoneHeader(ctx: Ctx): string {
  const titles = `<span data-only="list">${ctx.t("settings.title")}</span>${GROUPS3.map((g) => `<span data-only="${g.id}">${g.title(ctx)}</span>`).join("")}`;
  const back = `<button class="back" type="button" aria-label="${m3(ctx, "back")}" data-go="list" data-top data-only="${IDS3.join(" ")}"><span class="chev" aria-hidden="true"></span><span class="bl">${m3(ctx, "back")}</span></button>`;
  return `<div class="dhead3"><div class="hl">${back}</div><h2>${titles}</h2><div class="hr"><button class="btn small" type="button">${ctx.t("settings.done")}</button></div></div>`;
}

function deskHeader(ctx: Ctx): string {
  return `<div class="dhead3 wide"><h2>${ctx.t("settings.title")}</h2><div class="hr"><button class="btn small" type="button">${ctx.t("settings.done")}</button></div></div>`;
}

function sheet(ctx: Ctx, o: { header: string; top?: string; body: string; width?: number; height: number; nopad?: boolean }): string {
  const style = [o.width === undefined ? "" : `--w:${o.width}px`, `--h:${o.height}px`].filter((p) => p !== "").join(";");
  const grab = ctx.kind === "phone" || ctx.kind === "small" ? '<span class="grab"></span>' : "";
  return `<div class="sheet fixed" style="${style}" role="dialog">${grab}${o.header}${o.top ?? ""}<div class="body ${o.nopad ? "nopad" : ""}" data-scroll>${o.body}</div></div>`;
}

const PHONE_HEIGHT = 700;

export function finalPhone(open = false) {
  return (ctx: Ctx): string => {
    const small = ctx.kind === "small";
    const top = small ? "" : `<div data-only="lesson">${peek(ctx, open)}</div>`;
    const lead = small ? previewPanel(ctx, { rows: 2, keyboard: false }) : "";
    return sheet(ctx, { header: phoneHeader(ctx), top, body: `${listRows(ctx)}${panels(ctx, lead, false)}`, height: PHONE_HEIGHT });
  };
}

export function finalTablet(ctx: Ctx): string {
  const pane = `<div class="paneCol"><div data-only="lesson" class="tp-pin">${previewPanel(ctx, { rows: 2, keyboard: false })}</div><div class="pane">${panels(ctx, "", true)}</div></div>`;
  return sheet(ctx, { header: deskHeader(ctx), width: 780, height: 640, nopad: true, body: `<div class="split">${rail(ctx)}${pane}</div>` });
}

export function finalDesktop(ctx: Ctx): string {
  const column = `<aside class="pvcol" data-only="lesson">${previewPanel(ctx, { rows: 2, keyboard: true, zoom: 0.6 })}${sub(m3(ctx, "subGuide"), guideSwitches(ctx))}</aside>`;
  const pane = `<div class="pane">${panels(ctx, "", true)}</div>`;
  return sheet(ctx, { header: deskHeader(ctx), width: 1160, height: 700, nopad: true, body: `<div class="split">${rail(ctx)}${pane}${column}</div>` });
}

export const CSS3 = `
.frame.small{width:320px;height:568px;border-radius:24px;--ts:2}
.frame.tab{width:820px;height:1180px;border-radius:14px;zoom:.7;white-space:normal;padding:0;min-height:0;color:var(--ink);font-size:16px;cursor:auto;border:1px solid var(--line);background:var(--page)}
body.measure .frame.tab{zoom:1}
.small .sheet.fixed{height:511px}
.fig:has(.tab) figcaption{max-width:574px}
.fig:has(.small) figcaption{max-width:320px}
[data-frame]{--lesson-n:40}
.frame.phone{--vwscale:.7586}
.frame.small{--vwscale:.6224}
.frame.tab,.frame.desk{--vwscale:1}
.dhead3{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line);flex:none;min-height:56px}
.dhead3 .hl{justify-self:start}
.dhead3 .hr{justify-self:end}
.dhead3 h2{margin:0;font-size:17px;font-weight:600;text-align:center;min-width:0}
.dhead3.wide{grid-template-columns:1fr auto;padding:8px 16px}
.dhead3.wide h2{text-align:start;font-weight:500;font-size:18px}
.lt-wrap{font-size:calc(var(--lesson-n)*var(--vwscale,1)*1px);font-family:var(--lesson-font,"Scheherazade New"),serif;position:relative;overflow:clip;height:calc(var(--rows,2)*2em + .75rem)}
.lt{padding:.75rem 1rem 0;text-align:center;line-height:2;color:#8f9299;overflow-wrap:anywhere}
.lt p{margin:0}
.lt .done{color:#5b5d61}
.lt .mk{color:inherit}
.lt .done .mk{color:#5b5d61}
[data-vocal=letters] .lt .done .mk,[data-vocal=auto] .lt .done .mk{color:#8f9299}
[data-vocal=harakat] .lt .done .mk.t{color:#8f9299}
.lt .mis{color:var(--danger);display:inline-block}
.lt .caret{display:inline-block;width:1.5px;height:1.15em;background:var(--accent);vertical-align:-.25em}
[data-bs=on] .lt .caret{background:var(--danger)}
[data-bs=off] .bson{display:none}
.tp{display:flex;flex-direction:column;gap:6px;min-width:0}
.tp-label{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:0 4px}
.tp-box{border:1px solid var(--line);border-radius:14px;background:var(--page);overflow:hidden;padding-bottom:10px}
.tp-pin{padding:12px 16px;border-bottom:1px solid var(--line);flex:none}
.peek3{border-bottom:1px solid var(--line);background:var(--page);flex:none}
.peek3 summary{display:flex;align-items:center;gap:8px;padding:0 16px;min-height:56px}
.peek3 .peekl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);flex:none;width:64px}
.peek3 .pv-c{flex:1;min-width:0}
.peek3[open] .pv-c{display:none}
.peek3 .pv-o{display:none;padding:0 0 8px}
.peek3[open] .pv-o{display:block}
.gk-board{display:flex;flex-direction:column;align-items:flex-start;padding:10px 16px 0;width:700px}
.gk-row{display:flex;gap:4px;margin-bottom:4px}
.gk{height:36px;border:1px solid var(--line);border-radius:8px;display:grid;place-items:center;color:var(--muted);font-size:16px;flex:none;margin-inline-end:0;margin-inline-start:0}
.gk-row .gk{margin-inline-end:0}
.gk.hot{border-color:var(--accent);color:var(--accent);background:rgba(226,176,98,.12)}
[data-labels=off] .gk:not(.hot) .g{visibility:hidden}
.gk-hint{height:36px;display:flex;align-items:center;color:var(--accent);font-size:15px;width:660px;justify-content:center}
[data-kbd=off] .gk-board{display:none}
[data-finger=off] .gk-hint{visibility:hidden}
.vrow .v{flex:1;text-align:end;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;max-width:none}
.vrow .l{flex:none}
.rail button{align-items:stretch;min-width:0}
.rail button small{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hint:empty{display:none}
.shownat{color:var(--muted);text-transform:none;letter-spacing:0}
.paneCol{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.paneCol .pane{flex:1}
.pane>.stack{max-width:560px;gap:16px}
.pane .sec .sh{margin-bottom:8px}
.pvcol{width:470px;flex:none;border-inline-start:1px solid var(--line);padding:16px;overflow:auto;display:flex;flex-direction:column;gap:16px;background:var(--faint)}
.small .peek3 summary{min-height:56px}
.small .back .bl{display:none}
.split{min-width:0}
.body.nopad{overflow:hidden}
.pass{color:#9fd3a0}
.fail{color:var(--danger)}
.truth{display:grid;grid-template-columns:1fr 60px 1.2fr 60px 1fr;gap:0;align-items:center;margin:8px 0 28px}
.tbox{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:18px 20px}
.tbox.main{border-color:rgba(226,176,98,.6)}
.tbox h3{margin:0 0 6px;font-size:18px}
.tbox p{margin:0;color:var(--muted);font-size:15px}
.tbox ul{margin:8px 0 0;padding-inline-start:18px;color:var(--muted);font-size:15px}
.tarrow{text-align:center;color:var(--accent);font-size:30px}
.guards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 24px}
.guard{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px 18px}
.guard b{display:block;color:var(--accent);margin-bottom:4px}
.guard span{color:var(--muted);font-size:15px}
.realrow{display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap}
.realfig{margin:0}
.realfig img{display:block;border:1px solid var(--line);border-radius:14px}
.realfig figcaption{margin-top:10px;color:var(--muted);font-size:15px;max-width:1152px}
.realfig.d img{width:1152px}
.realfig.p img{width:390px;border-radius:30px}
.note{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:18px 22px;max-width:760px;color:var(--muted);font-size:16px}
.note b{color:var(--ink)}
`;

export function finalFrames(): readonly FrameSpec[] {
  const spec = (id: string, label: string, kind: FrameSpec["kind"], lang: FrameSpec["lang"], build: FrameSpec["build"], state: string, states: readonly string[], init?: string): FrameSpec => ({ id, label, kind, lang, build, state, states, init });
  const CH = "size=6;font=Amiri;vocal=harakat";
  return [
    spec("list", "Phone: where Settings opens. The title is centred, Done is on the right, General is first.", "phone", "en", finalPhone(), "list", ALL3),
    spec("lesson", "Lesson: the one-line preview is pinned under the title. It is the app's own lesson text at its real phone size.", "phone", "en", finalPhone(), "lesson", ALL3),
    spec("open", "Lesson, preview opened (three lines) and values changed: Amiri, text size 56, Harakat. The marks the learner types are dimmed like letters; Tanween stays lighter. A wrong key is shown because Backspace correction is on.", "phone", "en", finalPhone(true), "lesson", ALL3, CH),
    spec("recitation", "Recitation: the back button names where you came from; the title is centred on the dialog.", "phone", "en", finalPhone(), "recitation", ALL3),
    spec("data", "Your data: backup and restore, then Reset progress, apart and last.", "phone", "en", finalPhone(), "data", ALL3),
    spec("small", "320 px wide with text at 200%: Lesson. The back button keeps only its arrow (its name is still read out), and the preview scrolls with the controls instead of being pinned.", "small", "en", finalPhone(), "lesson", ALL3),
    spec("tab", "Tablet 820 x 1180 (touch, so no keyboard guide): rail, with the preview above the controls.", "tab", "en", finalTablet, "lesson", IDS3),
    spec("desk", "Desktop 1440 x 900: rail, controls, and a preview column holding the lesson text, the keyboard and the guide switches. Nothing scrolls.", "desk", "en", finalDesktop, "lesson", IDS3),
    spec("arList", "Arabic: the list. Chevrons, Done and the back arrow mirror.", "phone", "ar", finalPhone(), "list", ALL3),
    spec("arLesson", "Arabic: Lesson with the preview opened.", "phone", "ar", finalPhone(true), "lesson", ALL3, CH),
    spec("arDesk", "Arabic desktop.", "desk", "ar", finalDesktop, "lesson", IDS3),
  ];
}

export function finalBoard(): string {
  const frames = finalFrames().map((s) => frame(s, "FINAL")).join("");
  return `<article class="board" id="FINAL"><header class="bh"><span class="badge">F</span><div><h2>The final design</h2><p>Design 2 for phone and desktop, a push list on phone with the centred title, four groups with General first, and the Lesson group holding the preview with everything that changes it. Everything is clickable.</p></div></header><div class="frames">${frames}</div><div class="facts"><dl>
<div><dt>Groups</dt><dd>General, Lesson, Recitation, Your data. “Unlock all keys” has left Settings and moved to the Practice page (last board). Summaries are one line.</dd></div>
<div><dt>Tallest pane, measured</dt><dd>Phone (target 1.5 or less): <b data-metric="FINAL-list" data-limit="1.5">…</b> screens<br>Tablet: <b data-metric="FINAL-tab" data-limit="1.5">…</b><br>Desktop (target 1.0 or less): <b data-metric="FINAL-desk" data-limit="1.0">…</b></dd></div>
<div><dt>Reach</dt><dd>Any setting in 2 actions: open its group, then use it.</dd></div>
<div class="worst"><dt>What the mock-up cannot show</dt><dd>In the build the preview is not drawn like this. It is the app's own lesson surface and keyboard (next board). Here it only imitates them.</dd></div>
</dl></div></article>`;
}

export function truthBoard(): string {
  return `<article class="board" id="TRUTH"><header class="bh"><span class="badge">=</span><div><h2>How the preview cannot drift from the real lesson</h2><p>There is one implementation of the lesson text and one of the keyboard guide. The preview does not copy them. It mounts them.</p></div></header>
<div class="truth"><div class="tbox"><h3>Your settings</h3><p>The same <code>settings</code> object from the profile: font, text size, vocalization, Backspace correction, keyboard, finger guide, key labels, delayed hint.</p></div><div class="tarrow">→</div><div class="tbox main"><h3>The app's own lesson components</h3><p>The lesson text surface and the keyboard guide, exactly as the lesson pages use them. No second copy of any style, rule or layout.</p></div><div class="tarrow">→</div><div class="tbox"><h3>Two places they appear</h3><ul><li>Practice, Recitation, Custom (real typing)</li><li>The Settings preview (a fixed sample, no input)</li></ul></div></div>
<div class="guards"><div class="guard"><b>1. One code path</b><span>The preview imports the production lesson components and passes them a fixed, real session built with the real functions (prompt, session, vocalization rules). It owns no CSS for lesson text or keys.</span></div>
<div class="guard"><b>2. One type</b><span>Both the lesson and the preview take the same <code>LessonDisplaySettings</code> type. A setting that is not in it cannot reach the lesson or the preview.</span></div>
<div class="guard"><b>3. A setting cannot be forgotten</b><span>Every key of <code>Settings</code> is classified as “changes the lesson display” or “does not” in one exhaustive table. Adding a setting without classifying it fails the type check. Display settings must have a control in the Lesson group, and nothing else may.</span></div>
<div class="guard"><b>4. Parity tests in a real browser</b><span>For every display setting and its values, the same text and the same keyboard are rendered in the real lesson and in the preview, and their DOM, fonts, sizes, colours and highlighted ranges must be identical (the preview only adds one uniform zoom).</span></div>
<div class="guard"><b>5. A boundary test</b><span>A source-reading test fails if any preview file defines lesson styles, imports anything but the shared components, or draws text itself.</span></div>
<div class="guard"><b>6. Honest scale</b><span>On phone the preview is at 100%. On desktop the whole preview (text and keyboard together) is zoomed to 60% and labelled “Shown at 60%”, so every proportion stays exact.</span></div></div></article>`;
}

export function unlockBoard(): string {
  const fig = (cls: string, file: string, caption: string): string =>
    `<figure class="realfig ${cls}"><img src="real/${file}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`;
  return `<article class="board" id="UNLOCK"><header class="bh"><span class="badge">🔓</span><div><h2>Where “Unlock all keys” goes</h2><p>Screenshots of the real Practice page with the new control added. It sits in the progress row, next to “Keys unlocked 14 of 44”.</p></div></header>
<div class="realrow">${fig("d", "unlock-practice-desktop.png", "Desktop: the last item of the progress row.")}${fig("p", "unlock-practice-phone.png", "Phone: on its own row under the progress items, in the free space above the lesson.")}</div>
<div class="realrow" style="margin-top:32px">${fig("d", "unlock-practice-desktop-confirm.png", "After pressing it: a dialog asks first. “Not now” has the focus. A dialog, not an inline question, so the one-screen Practice page does not reflow.")}${fig("p", "unlock-practice-phone-confirm.png", "On a phone the same dialog is a bottom sheet.")}</div>
<div class="realrow" style="margin-top:32px"><div class="note"><b>Behaviour</b><br>Pressing “Unlock” unlocks all 44 keys, letters and marks (harakat) together, and never lowers progress. The progress row then reads “44 of 44” and the existing line “All keys are unlocked.” appears; the button goes away because there is nothing left to unlock. The lesson restarts with every key, and with Auto vocalization every mark is now required. Reset progress, in Settings under Your data, still takes you back to the start.<br><br><b>Wording</b><br>Button “Unlock all keys”; question “Unlock all keys?”; text “Practice will use every key from now on, marks included. Reset progress, in Settings, takes you back to the start.”; “Not now” and “Unlock”. Arabic in the plan.<br><br><b>Not shown</b><br>While the phone's keyboard is up the progress row is hidden, and so is the button, exactly as the row is today.</div></div></article>`;
}
