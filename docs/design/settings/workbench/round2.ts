import {
  aboutLink,
  ayatSeg,
  type Ctx,
  chev,
  dialog,
  esc,
  fontChips,
  type FrameSpec,
  frame,
  type Kind,
  languageSeg,
  orderSeg,
  reciterSeg,
  slider,
  sw,
  vocalSeg,
  backspaceSwitch,
} from "./lib.ts";

export type GId = "general" | "lesson" | "recitation" | "practice" | "data";

const M2 = {
  gGeneral: { en: "General", ar: "عام" },
  gLesson: { en: "Lesson", ar: "الدرس" },
  gRecitation: { en: "Recitation", ar: "التلاوة" },
  gPractice: { en: "Practice", ar: "التمرين" },
  gData: { en: "Your data", ar: "بياناتك" },
  subText: { en: "Text", ar: "النص" },
  subTyping: { en: "Typing", ar: "الكتابة" },
  subGuide: { en: "Keyboard guide", ar: "دليل لوحة المفاتيح" },
  subBackup: { en: "Backup and restore", ar: "النسخ الاحتياطي والاستعادة" },
  preview: { en: "Preview", ar: "معاينة" },
  previewMistake: { en: "A wrong key stays red until you press Backspace.", ar: "يبقى المفتاح الخاطئ أحمر حتى تضغط مفتاح الحذف." },
  previewBlocked: { en: "A wrong key is blocked. Nothing appears.", ar: "يُمنع المفتاح الخاطئ ولا يظهر شيء." },
  next: { en: "Next key", ar: "المفتاح التالي" },
  leftMiddle: { en: "Left middle finger", ar: "إصبع اليد اليسرى الوسطى" },
  ayat: { en: "ayat", ar: "آيات" },
  dataSummary: { en: "Backup, restore, reset", ar: "نسخ، استعادة، إعادة ضبط" },
  back: { en: "Settings", ar: "الإعدادات" },
  chosen: { en: "mafatih-backup-2026-11-20.json", ar: "mafatih-backup-2026-11-20.json" },
  chooseDone: { en: "Chosen file", ar: "الملف المختار" },
  showPreview: { en: "Show the full preview", ar: "إظهار المعاينة كاملة" },
  unlockHint: { en: "Practice uses every letter from now on. Marks stay locked.", ar: "سيستخدم التمرين كل الحروف من الآن. تبقى الحركات مقفلة." },
  tabsLabel: { en: "Settings groups", ar: "مجموعات الإعدادات" },
} as const satisfies Record<string, { readonly en: string; readonly ar: string }>;

type M2Key = keyof typeof M2;
const m2 = (ctx: Ctx, key: M2Key): string => esc(M2[key][ctx.lang]);
const bdi = (text: string): string => `<bdi>${text}</bdi>`;
const isPhoneLike = (ctx: Ctx): boolean => ctx.kind === "phone" || ctx.kind === "small";
const hasGuide = (ctx: Ctx): boolean => ctx.kind === "desk";

const MARKS = /([ً-ْ])/g;
const mk = (text: string): string => text.replace(MARKS, '<span class="mk">$1</span>');

function keyboardStrip(ctx: Ctx): string {
  const row = (letters: string, hot?: string): string =>
    `<div class="krow">${[...letters].map((letter) => `<span class="key${letter === hot ? " hot" : ""}">${letter}</span>`).join("")}</div>`;
  return `<div class="kbd">${row("ضصثقفغعهخح")}${row("شسيبلاتنمك", "ب")}${row("ئءؤرلاىةوز")}</div><div class="fingernote">${m2(ctx, "next")}: ب · ${m2(ctx, "leftMiddle")}</div>`;
}

function previewLine(): string {
  return `<div class="pvtext" lang="ar" dir="rtl">${mk('<span class="done">كَتَ</span>')}<span class="wrong bson">ر</span>${mk('<span class="cur up">بَ</span><span class="up"> الوَلَدُ الدَّرْسَ</span>')}</div>`;
}

function mistakeNote(ctx: Ctx): string {
  return `<div class="pvnote"><span class="bson">${m2(ctx, "previewMistake")}</span><span class="bsoff">${m2(ctx, "previewBlocked")}</span></div>`;
}

function layoutHint(ctx: Ctx): string {
  return `<p class="hint">${ctx.t("settings.layoutHint", { layout: ctx.t("guide.layout") })}</p>`;
}

function previewCard(ctx: Ctx, o: { keyboard: boolean; pinned: boolean }): string {
  return `<div class="preview${o.pinned ? " pin" : ""}"><div class="pvlabel"><span>${m2(ctx, "preview")}</span></div>${previewLine()}${mistakeNote(ctx)}${o.keyboard ? keyboardStrip(ctx) : ""}</div>`;
}

function peekCard(ctx: Ctx): string {
  return `<details class="peek"><summary><span class="peekl">${m2(ctx, "preview")}</span>${previewLine()}${chev()}</summary><div class="peekbody">${mistakeNote(ctx)}</div></details>`;
}

function sub(title: string, body: string): string {
  return `<section class="sec"><h3 class="sh">${title}</h3><div class="stack">${body}</div></section>`;
}

function guideSwitches(ctx: Ctx): string {
  return `<div class="swlist">${sw({ label: ctx.t("settings.showKeyboard"), flag: "kbd" })}${sw({ label: ctx.t("settings.fingerGuide"), flag: "finger" })}${sw({ label: ctx.t("settings.keyLabels"), flag: "labels" })}${sw({ label: ctx.t("settings.delayedHint"), hint: ctx.t("settings.delayedHintHint", { seconds: ctx.n(3) }), checked: false })}</div>${layoutHint(ctx)}`;
}

function lessonControls(ctx: Ctx, guideInColumn: boolean): string {
  return `${sub(m2(ctx, "subText"), `${fontChips(ctx)}${slider(ctx)}`)}${sub(m2(ctx, "subTyping"), `${vocalSeg(ctx, true)}${backspaceSwitch(ctx)}`)}${hasGuide(ctx) && !guideInColumn ? sub(m2(ctx, "subGuide"), guideSwitches(ctx)) : ""}`;
}

type Variant = "idle" | "confirm" | "error" | "done" | "files" | "none" | "deleted" | "ring";

function confirmBox(ctx: Ctx, o: { question: string; warning: string; keep: string; confirm: string; danger: boolean }): string {
  return `<fieldset class="confirm"><legend class="sr">${o.question}</legend><div class="lab">${o.question}</div><p class="hint">${o.warning}</p><div class="btnrow"><button type="button" class="btn ring">${o.keep}</button><button type="button" class="btn${o.danger ? " danger" : ""}">${o.confirm}</button></div></fieldset>`;
}

function generalBody(ctx: Ctx): string {
  return `${languageSeg(ctx)}${aboutLink(ctx)}`;
}

function recitationBody(ctx: Ctx, variant: Variant): string {
  const usage =
    variant === "none" || variant === "deleted"
      ? ctx.t("audio.usage", { files: ctx.n(0), size: `${ctx.n(0)} kB` })
      : ctx.t("audio.usage", { files: ctx.n(12), size: `${ctx.n(3.4)} MB` });
  const status = variant === "deleted" ? ctx.t("audio.deleted") : "";
  const cache = `<div class="set"><p class="hint">${usage}</p><div class="btnrow"><button class="btn small" type="button">${ctx.t("audio.delete")}</button></div><p class="status" role="status">${status}</p></div>`;
  return `${ayatSeg(ctx)}${orderSeg(ctx)}${reciterSeg(ctx)}${cache}`;
}

function practiceBody(ctx: Ctx, variant: Variant): string {
  const all = variant === "done";
  const stat = `<div class="statline"><span>${ctx.t("hud.keys")}</span><b>${ctx.t("hud.keysValue", { count: ctx.n(all ? 36 : 10), total: ctx.n(44) })}</b></div>`;
  if (variant === "confirm") {
    return `${stat}${confirmBox(ctx, { question: ctx.t("settings.unlockQuestion"), warning: ctx.t("settings.unlockWarning"), keep: ctx.t("settings.unlockKeep"), confirm: ctx.t("settings.unlockConfirm"), danger: false })}`;
  }
  const button = `<button type="button" class="btn" ${all ? 'aria-disabled="true"' : ""}>${ctx.t("settings.unlockLetters")}</button>`;
  return `${stat}<div class="set"><p class="hint">${m2(ctx, "unlockHint")}</p><div class="btnrow">${button}</div><p class="status" role="status">${all ? ctx.t("settings.unlockDone") : ""}</p></div>`;
}

function dataBody(ctx: Ctx, variant: Variant, scenario: "restore" | "reset" | "none"): string {
  const picked =
    scenario === "restore" ? `<p class="hint">${m2(ctx, "chooseDone")}: <bdi>${m2(ctx, "chosen")}</bdi></p>` : "";
  const restoreConfirm =
    scenario === "restore" && variant === "confirm"
      ? confirmBox(ctx, { question: ctx.t("backup.question"), warning: ctx.t("backup.warning"), keep: ctx.t("settings.keepProgress"), confirm: ctx.t("backup.replace"), danger: true })
      : "";
  const restoreError =
    scenario === "restore" && variant === "error" ? `<p class="alert" role="alert">${ctx.t("backup.notABackup")}</p>` : "";
  const restoreDone = scenario === "restore" && variant === "done" ? ctx.t("backup.restored") : "";
  const backup = `<p class="hint">${ctx.t("backup.hint")}</p><div class="btnrow"><button class="btn" type="button">${ctx.t("backup.download")}</button><button class="btn${variant === "ring" ? " ring" : ""}" type="button">${ctx.t("backup.choose")}</button></div>${picked}${restoreError}${restoreConfirm}<p class="status" role="status">${restoreDone}</p>`;
  const resetBlock =
    scenario === "reset" && variant === "confirm"
      ? confirmBox(ctx, { question: ctx.t("settings.resetQuestion"), warning: ctx.t("settings.resetWarning"), keep: ctx.t("settings.keepProgress"), confirm: ctx.t("settings.resetConfirm"), danger: true })
      : `<p class="hint">${ctx.t("settings.resetWarning")}</p><div class="btnrow"><button type="button" class="btn danger">${ctx.t("settings.reset")}</button></div><p class="status" role="status">${scenario === "reset" && variant === "done" ? ctx.t("settings.resetDone") : ""}</p>`;
  return `${sub(m2(ctx, "subBackup"), backup)}${sub(ctx.t("settings.reset"), resetBlock)}`;
}

export interface PaneOverrides {
  readonly recitation?: Variant;
  readonly practice?: Variant;
  readonly data?: { readonly variant: Variant; readonly scenario: "restore" | "reset" | "none" };
  readonly guideInColumn?: boolean;
}

interface G2 {
  readonly id: GId;
  title(ctx: Ctx): string;
  short(ctx: Ctx): string;
  summary(ctx: Ctx): string;
}

const GROUPS2: readonly G2[] = [
  { id: "general", title: (c) => m2(c, "gGeneral"), short: (c) => m2(c, "gGeneral"), summary: (c) => (c.lang === "ar" ? "العربية" : "English") },
  { id: "lesson", title: (c) => m2(c, "gLesson"), short: (c) => m2(c, "gLesson"), summary: (c) => `${bdi("Scheherazade New")} · ${c.n(40)} · ${c.t("vocalization.auto")}` },
  { id: "recitation", title: (c) => m2(c, "gRecitation"), short: (c) => m2(c, "gRecitation"), summary: (c) => `${c.t("reciter.murattal")} · ${c.n(4)} ${m2(c, "ayat")}` },
  { id: "practice", title: (c) => m2(c, "gPractice"), short: (c) => m2(c, "gPractice"), summary: (c) => c.t("hud.keysValue", { count: c.n(10), total: c.n(44) }) },
  { id: "data", title: (c) => m2(c, "gData"), short: (c) => m2(c, "gData"), summary: (c) => m2(c, "dataSummary") },
];

const ids2 = GROUPS2.map((g) => g.id);
export const ALL2: readonly string[] = ["list", ...ids2];
export const GROUP_IDS: readonly string[] = ids2;

function bodyOf(ctx: Ctx, id: GId, o: PaneOverrides, lessonLead: string): string {
  switch (id) {
    case "general":
      return generalBody(ctx);
    case "lesson":
      return `${lessonLead}${lessonControls(ctx, o.guideInColumn === true)}`;
    case "recitation":
      return recitationBody(ctx, o.recitation ?? "files");
    case "practice":
      return practiceBody(ctx, o.practice ?? "idle");
    case "data":
      return dataBody(ctx, o.data?.variant ?? "idle", o.data?.scenario ?? "none");
  }
}

function panels(ctx: Ctx, o: PaneOverrides, lessonLead: string, withTitle: boolean): string {
  return GROUPS2.map(
    (g) => `<div class="stack" data-only="${g.id}">${withTitle ? `<h3 class="sr">${g.title(ctx)}</h3>` : ""}${bodyOf(ctx, g.id, o, lessonLead)}</div>`,
  ).join("");
}

function listRows(ctx: Ctx): string {
  return `<div class="vrows" data-only="list">${GROUPS2.map(
    (g) =>
      `<button type="button" class="vrow" data-go="${g.id}" data-top><span class="l">${g.title(ctx)}</span><span class="v">${g.summary(ctx)}</span>${chev()}</button>`,
  ).join("")}</div>`;
}

function titleSwitch(ctx: Ctx): string {
  return `<span data-only="list">${ctx.t("settings.title")}</span>${GROUPS2.map((g) => `<span data-only="${g.id}">${g.title(ctx)}</span>`).join("")}`;
}

function backLead(ctx: Ctx): string {
  return `<button class="back" type="button" data-go="list" data-top data-only="${ids2.join(" ")}"><span class="chev" aria-hidden="true"></span>${m2(ctx, "back")}</button>`;
}

function rail(ctx: Ctx): string {
  return `<nav class="rail" aria-label="${m2(ctx, "tabsLabel")}">${GROUPS2.map(
    (g) => `<button type="button" data-go="${g.id}" data-on="${g.id}"><b>${g.title(ctx)}</b><small>${g.summary(ctx)}</small></button>`,
  ).join("")}</nav>`;
}

function tabStrip(ctx: Ctx): string {
  return `<div class="tabs" role="tablist" aria-label="${m2(ctx, "tabsLabel")}">${GROUPS2.map(
    (g) => `<button type="button" role="tab" class="tab" data-go="${g.id}" data-on="${g.id}">${g.short(ctx)}</button>`,
  ).join("")}</div>`;
}

const PHONE_HEIGHT = 700;

export function pushPinned(o: PaneOverrides = {}) {
  return (ctx: Ctx): string => {
    const small = ctx.kind === "small";
    const pin = small ? "" : `<div data-only="lesson">${previewCard(ctx, { keyboard: false, pinned: true })}</div>`;
    const lead = small ? previewCard(ctx, { keyboard: false, pinned: false }) : "";
    return dialog(ctx, {
      height: PHONE_HEIGHT,
      titleHtml: titleSwitch(ctx),
      lead: backLead(ctx),
      top: pin,
      body: `${listRows(ctx)}${panels(ctx, o, lead, false)}`,
    });
  };
}

export function pushPeek(o: PaneOverrides = {}) {
  return (ctx: Ctx): string =>
    dialog(ctx, {
      height: PHONE_HEIGHT,
      titleHtml: titleSwitch(ctx),
      lead: backLead(ctx),
      top: `<div data-only="lesson">${peekCard(ctx)}</div>`,
      body: `${listRows(ctx)}${panels(ctx, o, "", false)}`,
    });
}

export function tabsInline(o: PaneOverrides = {}) {
  return (ctx: Ctx): string =>
    dialog(ctx, {
      height: PHONE_HEIGHT,
      top: tabStrip(ctx),
      body: panels(ctx, o, previewCard(ctx, { keyboard: false, pinned: false }), false),
    });
}

export function railPinned(o: PaneOverrides = {}) {
  return (ctx: Ctx): string => {
    const width = ctx.kind === "tab" ? 780 : 820;
    const height = ctx.kind === "tab" ? 640 : 640;
    return dialog(ctx, {
      width,
      height,
      bodyClass: "nopad",
      body: `<div class="split">${rail(ctx)}<div class="paneCol"><div data-only="lesson">${previewCard(ctx, { keyboard: hasGuide(ctx), pinned: true })}</div><div class="pane">${panels(ctx, o, "", true)}</div></div></div>`,
    });
  };
}

export function railBeside(o: PaneOverrides = {}) {
  return (ctx: Ctx): string => {
    if (!hasGuide(ctx)) {
      return railPinned(o)(ctx);
    }
    const column = `<aside class="pvcol" data-only="lesson">${previewCard(ctx, { keyboard: true, pinned: false })}${sub(m2(ctx, "subGuide"), guideSwitches(ctx))}</aside>`;
    return dialog(ctx, {
      width: 1080,
      height: 640,
      bodyClass: "nopad",
      body: `<div class="split">${rail(ctx)}<div class="pane">${panels(ctx, { ...o, guideInColumn: true }, "", true)}</div>${column}</div>`,
    });
  };
}

export type { FrameSpec, Kind };
export { frame };

export const CSS2 = `
.frame.small{width:320px;height:568px;border-radius:24px;--ts:2}
.frame.tab{width:820px;height:1180px;border-radius:14px;zoom:.7}
body.measure .frame.tab{zoom:1}
.small .sheet.fixed{height:511px}
.fig:has(.tab) figcaption{max-width:574px}
.fig:has(.small) figcaption{max-width:320px}
.pin{margin:0;border-radius:0;border-width:0 0 1px;background:var(--faint);padding:10px 16px}
.pvtext{overflow:hidden;max-height:calc(var(--lesson-size,40px)*2.1)}
.phone .pvtext,.small .pvtext{font-size:calc(var(--lesson-size,40px)*.55);line-height:1.7}
.peek{border-bottom:1px solid var(--line);background:var(--faint);flex:none}
.peek summary{display:flex;align-items:center;gap:12px;padding:8px 16px;min-height:60px}
.peek .peekl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);flex:none}
.peek .pvtext{flex:1;max-height:calc(var(--lesson-size,40px)*1.4);line-height:1.5;white-space:nowrap}
.peek .peekbody{padding:0 16px 12px}
.paneCol{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.paneCol>[data-only]{flex:none}
.paneCol .pane{flex:1}
.pvcol{width:370px;flex:none;border-inline-start:1px solid var(--line);padding:16px;overflow:auto;display:flex;flex-direction:column;gap:14px;background:var(--faint)}
.pvcol .preview{margin:0;border:0;padding:0;background:none}
.pane>.stack{max-width:560px;gap:16px}
.pane .sec .sh{margin-bottom:8px}
.statline{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--faint)}
.statline b{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums}
.confirm{margin:0;padding:12px 14px;display:flex;flex-direction:column;gap:10px;border:1px solid var(--line);border-radius:14px;background:var(--faint);min-width:0}
.status{min-height:20px;color:var(--muted);font-size:13px;margin:0}
.alert{color:var(--danger);font-size:13px;font-weight:500;margin:0}
.btn.ring{outline:2px solid var(--focus);outline-offset:2px}
.btn[aria-disabled=true]{opacity:.5;cursor:default}
[data-labels=off] .key:not(.hot){color:transparent}
.pass{color:#9fd3a0}
.fail{color:var(--danger)}
.targets dd b{font-weight:700}
.legend{display:flex;gap:24px;flex-wrap:wrap;margin:0 0 24px;color:var(--muted);font-size:16px}
.legend b{color:var(--ink)}
.cmprow{margin:0 0 44px}
.cmptext{display:flex;gap:16px;align-items:center;margin-bottom:16px}
.cmptext h3{margin:0;font-size:22px}
.cmptext p{margin:4px 0 0;color:var(--muted);max-width:1500px;font-size:15px}
`;
