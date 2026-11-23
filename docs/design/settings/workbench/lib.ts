import { ar } from "../../../../src/i18n/ar.ts";
import { en, type MessageKey } from "../../../../src/i18n/en.ts";

export type Lang = "en" | "ar";
export type Kind = "phone" | "desk" | "tab" | "small";
export type GroupId = "general" | "lesson" | "typing" | "guide" | "recitation" | "progress";

const MOCK = {
  gGeneral: { en: "General", ar: "عام" },
  gLesson: { en: "Lesson text", ar: "نص الدرس" },
  gTyping: { en: "Typing", ar: "الكتابة" },
  gGuide: { en: "Keyboard guide", ar: "دليل لوحة المفاتيح" },
  gRecitation: { en: "Recitation", ar: "التلاوة" },
  gProgress: { en: "Progress and data", ar: "التقدم والبيانات" },
  sLesson: { en: "Text", ar: "النص" },
  sGuide: { en: "Guide", ar: "الدليل" },
  sProgress: { en: "Data", ar: "البيانات" },
  ayat: { en: "ayat", ar: "آيات" },
  backspaceOn: { en: "Backspace on", ar: "الحذف الخلفي مفعّل" },
  guideSummary: { en: "Keyboard and finger guide", ar: "لوحة المفاتيح والإصبع" },
  progressSummary: { en: "Backup, unlock, reset", ar: "نسخ احتياطي، فتح، إعادة ضبط" },
  more: { en: "More settings", ar: "إعدادات أخرى" },
  essentials: { en: "Essentials", ar: "الأساسيات" },
  back: { en: "Settings", ar: "الإعدادات" },
  search: { en: "Search settings", ar: "ابحث في الإعدادات" },
  searchHint: { en: "font, backspace, audio, reset", ar: "خط، حذف، صوت، إعادة ضبط" },
  noResults: { en: "Nothing matches. Try “font” or “audio”.", ar: "لا شيء يطابق. جرّب «خط» أو «صوت».", },
  forPage: { en: "For this page", ar: "لهذه الصفحة" },
  allSettings: { en: "All settings", ar: "كل الإعدادات" },
  pRecitation: { en: "Opened from Recitation", ar: "فُتحت من التلاوة" },
  pPractice: { en: "Opened from Practice", ar: "فُتحت من التمرين" },
  previewTitle: { en: "What you will see", ar: "ما ستراه" },
  previewMistake: { en: "A wrong key stays red until you press Backspace.", ar: "يبقى المفتاح الخاطئ أحمر حتى تضغط مفتاح الحذف." },
  previewBlocked: { en: "A wrong key is blocked. Nothing appears.", ar: "يُمنع المفتاح الخاطئ ولا يظهر شيء." },
  next: { en: "Next key", ar: "المفتاح التالي" },
  leftMiddle: { en: "Left middle finger", ar: "إصبع اليد اليسرى الوسطى" },
  tapToChange: { en: "Tap a row to change it", ar: "اضغط على صف لتغييره" },
  essentialsMore: { en: "Fonts, marks, recitation and your data are under More settings.", ar: "الخطوط والحركات والتلاوة وبياناتك في إعدادات أخرى." },
  pageTitle: { en: "Settings", ar: "الإعدادات" },
  navRecitation: { en: "Recitation", ar: "التلاوة" },
  navPractice: { en: "Practice", ar: "التمرين" },
  navCustom: { en: "Custom", ar: "نص حر" },
  navStats: { en: "Stats", ar: "الإحصاءات" },
  usageSample: { en: "Saved recitations: 12 (3.4 MB)", ar: "التلاوات المحفوظة: ١٢ (٣٫٤ ميغابايت)" },
  usageShort: { en: "12 saved · 3.4 MB", ar: "١٢ محفوظة · ٣٫٤ ميغابايت" },
  deleteShort: { en: "Delete", ar: "حذف" },
  downloadShort: { en: "Download", ar: "تنزيل" },
  restoreShort: { en: "Restore", ar: "استعادة" },
  advanced: { en: "Advanced", ar: "متقدم" },
  masterOn: { en: "On", ar: "مفعّل" },
  dangerZone: { en: "Careful", ar: "بحذر" },
  one: { en: "everywhere", ar: "في كل مكان" },
  applyHint: { en: "Changes apply at once.", ar: "تُطبَّق التغييرات فورًا." },
} as const satisfies Record<string, { readonly en: string; readonly ar: string }>;

export type MockKey = keyof typeof MOCK;

export const FONT_SIZES: readonly number[] = [28, 32, 36, 40, 44, 48, 56, 64, 72];
export const FONTS: readonly { readonly id: string; readonly family: string }[] = [
  { id: "scheherazade", family: "Scheherazade New" },
  { id: "amiri", family: "Amiri" },
  { id: "naskh", family: "Noto Naskh Arabic" },
];
const FONT_SAMPLE = "الخَطُّ العَرَبِيُّ";
const LESSON_LINE = "كَتَبَ الوَلَدُ الدَّرْسَ";

export interface Ctx {
  readonly lang: Lang;
  readonly dir: "ltr" | "rtl";
  readonly kind: Kind;
  t(key: MessageKey, vars?: Readonly<Record<string, string | number>>): string;
  m(key: MockKey): string;
  n(value: number): string;
  uid(prefix: string): string;
}

export function esc(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

let uidCounter = 0;

export function makeCtx(lang: Lang, kind: Kind): Ctx {
  const table: Readonly<Record<MessageKey, string>> = lang === "ar" ? ar : en;
  const numbers = new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-arab" : "en");
  return {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    kind,
    t: (key, vars) => {
      let text = table[key];
      for (const [name, value] of Object.entries(vars ?? {})) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
      return esc(text);
    },
    m: (key) => esc(MOCK[key][lang]),
    n: (value) => numbers.format(value),
    uid: (prefix) => {
      uidCounter += 1;
      return `${prefix}${uidCounter}`;
    },
  };
}

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  readonly attrs?: string;
}

export function seg(
  ctx: Ctx,
  o: { legend?: string; value: string; options: readonly Option[]; full?: boolean; hints?: boolean; label?: string },
): string {
  const name = ctx.uid("seg");
  const checked = o.options.find((option) => option.value === o.value);
  return `<fieldset class="set"><legend class="${o.legend === undefined ? "sr" : "lab"}">${o.legend ?? o.label ?? ""}</legend>
<div class="seg${o.full ? " full" : ""}">${o.options
    .map(
      (option) =>
        `<label><input type="radio" name="${name}" value="${option.value}" data-hintbox="${name}" data-hint="${option.hint ?? ""}" ${option.attrs ?? ""} ${option.value === o.value ? "checked" : ""}><span>${option.label}</span></label>`,
    )
    .join("")}</div>${o.hints ? `<p class="hint" data-hintfor="${name}">${checked?.hint ?? ""}</p>` : ""}</fieldset>`;
}

export function radios(ctx: Ctx, o: { legend: string; value: string; options: readonly Option[] }): string {
  const name = ctx.uid("rad");
  return `<fieldset class="set"><legend class="lab">${o.legend}</legend><div class="radios">${o.options
    .map(
      (option) =>
        `<label class="radio"><input type="radio" name="${name}" ${option.attrs ?? ""} ${option.value === o.value ? "checked" : ""}><span class="rb"></span><span class="rt"><span class="l">${option.label}</span>${option.hint === undefined ? "" : `<span class="hint">${option.hint}</span>`}</span></label>`,
    )
    .join("")}</div></fieldset>`;
}

export function sw(o: { label: string; hint?: string; checked?: boolean; flag?: string }): string {
  return `<label class="swrow"><input type="checkbox" role="switch" class="sw" ${o.flag === undefined ? "" : `data-flag="${o.flag}"`} ${o.checked === false ? "" : "checked"}><span class="rt"><span class="l">${o.label}</span>${o.hint === undefined ? "" : `<span class="hint">${o.hint}</span>`}</span></label>`;
}

export function slider(ctx: Ctx): string {
  const id = ctx.uid("size");
  return `<div class="set"><label class="lab" for="${id}">${ctx.t("settings.fontSize")}</label><div class="rangerow"><input id="${id}" type="range" min="0" max="${FONT_SIZES.length - 1}" step="1" value="3" data-size><output data-size-out>${ctx.n(40)}</output></div></div>`;
}

export function languageSeg(ctx: Ctx, full = false): string {
  return seg(ctx, {
    legend: ctx.t("settings.language"),
    value: ctx.lang,
    full,
    options: [
      { value: "en", label: "English" },
      { value: "ar", label: "العربية" },
    ],
  });
}

export function vocalSeg(ctx: Ctx, preview = false): string {
  const pv = preview ? "data-pv-vocal" : "";
  return seg(ctx, {
    legend: ctx.t("settings.vocalization"),
    value: "auto",
    hints: true,
    options: (["auto", "letters", "harakat", "full"] as const).map((key) => ({
      value: key,
      label: ctx.t(`vocalization.${key}`),
      hint: ctx.t(`vocalization.${key}Hint`),
      attrs: `${pv} data-vocal="${key}"`,
    })),
  });
}

export function vocalRadios(ctx: Ctx): string {
  return radios(ctx, {
    legend: ctx.t("settings.vocalization"),
    value: "auto",
    options: (["auto", "letters", "harakat", "full"] as const).map((key) => ({
      value: key,
      label: ctx.t(`vocalization.${key}`),
      hint: ctx.t(`vocalization.${key}Hint`),
    })),
  });
}

export function backspaceSwitch(ctx: Ctx): string {
  return sw({ label: ctx.t("settings.backspace"), hint: ctx.t("settings.backspaceHint"), flag: "bs" });
}

export function sampleLine(): string {
  return `<div class="sample" data-sample lang="ar" dir="rtl">${FONT_SAMPLE}</div>`;
}

export function fontChips(ctx: Ctx): string {
  const name = ctx.uid("font");
  return `<fieldset class="set"><legend class="lab">${ctx.t("settings.font")}</legend><div class="chips">${FONTS.map(
    (font, index) =>
      `<label class="fchip"><input type="radio" name="${name}" data-font="${font.family}" ${index === 0 ? "checked" : ""}><span><b lang="ar" dir="rtl" style="font-family:'${font.family}'">الخط</b><i>${font.family}</i></span></label>`,
  ).join("")}</div></fieldset>`;
}

export function fontRadios(ctx: Ctx): string {
  const name = ctx.uid("fontr");
  return `<fieldset class="set"><legend class="lab">${ctx.t("settings.font")}</legend><div class="radios">${FONTS.map(
    (font, index) =>
      `<label class="radio"><input type="radio" name="${name}" ${index === 0 ? "checked" : ""}><span class="rb"></span><span class="rt"><span class="l">${font.family}</span><span class="fsample" lang="ar" dir="rtl" style="font-family:'${font.family}'">${FONT_SAMPLE}</span></span></label>`,
  ).join("")}</div></fieldset>`;
}

export function lessonText(ctx: Ctx): string {
  return `<div class="set gap">${fontChips(ctx)}${sampleLine()}${slider(ctx)}</div>`;
}

export function guideSwitches(ctx: Ctx): string {
  return `<div class="set"><div class="swlist">${sw({ label: ctx.t("settings.showKeyboard"), flag: "kbd" })}${sw({ label: ctx.t("settings.fingerGuide"), flag: "finger" })}${sw({ label: ctx.t("settings.keyLabels") })}${sw({ label: ctx.t("settings.delayedHint"), hint: ctx.t("settings.delayedHintHint", { seconds: ctx.n(3) }), checked: false })}</div><p class="hint">${ctx.t("settings.layoutHint", { layout: ctx.t("guide.layout") })}</p></div>`;
}

export function guideTitle(ctx: Ctx): string {
  return `<div class="lab">${ctx.t("settings.guide")}</div>`;
}

export function ayatSeg(ctx: Ctx): string {
  return seg(ctx, {
    legend: ctx.t("settings.ayatPerPassage"),
    value: "4",
    options: [1, 2, 3, 4].map((count) => ({ value: String(count), label: ctx.n(count) })),
  });
}

export function orderSeg(ctx: Ctx): string {
  return seg(ctx, {
    legend: ctx.t("settings.surahOrder"),
    value: "mushaf",
    hints: true,
    options: [
      { value: "mushaf", label: ctx.t("order.mushaf"), hint: ctx.t("order.mushafHint") },
      { value: "juz", label: ctx.t("order.juzAmma"), hint: ctx.t("order.juzAmmaHint") },
    ],
  });
}

export function reciterSeg(ctx: Ctx): string {
  return seg(ctx, {
    legend: ctx.t("settings.reciter"),
    value: "murattal",
    hints: true,
    options: [
      { value: "murattal", label: ctx.t("reciter.murattal"), hint: ctx.t("reciter.murattalHint") },
      { value: "mujawwad", label: ctx.t("reciter.mujawwad"), hint: ctx.t("reciter.mujawwadHint") },
    ],
  });
}

export function cacheRow(ctx: Ctx): string {
  return `<div class="cache"><span class="hint">${ctx.m("usageShort")}</span><button class="btn small" type="button">${ctx.m("deleteShort")}</button></div>`;
}

export function cacheBlock(ctx: Ctx): string {
  return `<div class="set"><p class="hint">${ctx.m("usageSample")}</p><button class="btn" type="button">${ctx.t("audio.delete")}</button></div>`;
}

export function backupBlock(ctx: Ctx): string {
  return `<div class="set"><div class="lab">${ctx.t("backup.title")}</div><p class="hint">${ctx.t("backup.hint")}</p><div class="btnrow"><button class="btn" type="button">${ctx.t("backup.download")}</button><button class="btn" type="button">${ctx.t("backup.choose")}</button></div></div>`;
}

export function unlockButton(ctx: Ctx): string {
  return `<button class="btn" type="button">${ctx.t("settings.unlockLetters")}</button>`;
}

export function resetButton(ctx: Ctx): string {
  return `<button class="btn danger" type="button">${ctx.t("settings.reset")}</button>`;
}

export function aboutLink(ctx: Ctx): string {
  return `<a class="about" href="#">${ctx.t("nav.about")}</a>`;
}

export interface Group {
  readonly id: GroupId;
  title(ctx: Ctx): string;
  short(ctx: Ctx): string;
  summary(ctx: Ctx): string;
  body(ctx: Ctx): string;
}

export const GROUPS: readonly Group[] = [
  {
    id: "general",
    title: (c) => c.m("gGeneral"),
    short: (c) => c.m("gGeneral"),
    summary: (c) => (c.lang === "ar" ? "العربية" : "English"),
    body: (c) => `${languageSeg(c)}${aboutLink(c)}`,
  },
  {
    id: "lesson",
    title: (c) => c.m("gLesson"),
    short: (c) => c.m("sLesson"),
    summary: (c) => `<bdi>Scheherazade New</bdi> · ${c.n(40)}`,
    body: (c) => lessonText(c),
  },
  {
    id: "typing",
    title: (c) => c.m("gTyping"),
    short: (c) => c.m("gTyping"),
    summary: (c) => `${c.t("vocalization.auto")} · ${c.m("backspaceOn")}`,
    body: (c) => `${vocalSeg(c)}${backspaceSwitch(c)}`,
  },
  {
    id: "guide",
    title: (c) => c.m("gGuide"),
    short: (c) => c.m("sGuide"),
    summary: (c) => c.m("guideSummary"),
    body: (c) => guideSwitches(c),
  },
  {
    id: "recitation",
    title: (c) => c.m("gRecitation"),
    short: (c) => c.m("gRecitation"),
    summary: (c) => `${c.t("reciter.murattal")} · ${c.n(4)} ${c.m("ayat")}`,
    body: (c) => `${ayatSeg(c)}${orderSeg(c)}${reciterSeg(c)}${cacheRow(c)}`,
  },
  {
    id: "progress",
    title: (c) => c.m("gProgress"),
    short: (c) => c.m("sProgress"),
    summary: (c) => c.m("progressSummary"),
    body: (c) => `${backupBlock(c)}<div class="set"><div class="lab">${c.t("settings.unlockLetters")}</div>${unlockButton(c)}</div><div class="set"><div class="lab">${c.t("settings.reset")}</div>${resetButton(c)}</div>`,
  },
];

export function groupsFor(kind: Kind): readonly Group[] {
  return kind === "phone" ? GROUPS.filter((group) => group.id !== "guide") : GROUPS;
}

export function group(id: GroupId): Group {
  const found = GROUPS.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`unknown group ${id}`);
  }
  return found;
}

export interface DialogOptions {
  readonly title?: string;
  readonly titleHtml?: string;
  readonly body: string;
  readonly top?: string;
  readonly width?: number;
  readonly height?: number;
  readonly lead?: string;
  readonly bodyClass?: string;
  readonly noDone?: boolean;
}

export function dialog(ctx: Ctx, o: DialogOptions): string {
  const style = [o.width === undefined ? "" : `--w:${o.width}px`, o.height === undefined ? "" : `--h:${o.height}px`]
    .filter((part) => part !== "")
    .join(";");
  return `<div class="sheet${o.height === undefined ? "" : " fixed"}" style="${style}" role="dialog">${ctx.kind === "phone" || ctx.kind === "small" ? '<span class="grab"></span>' : ""}<div class="dhead">${o.lead ?? ""}<h2>${o.titleHtml ?? o.title ?? ctx.t("settings.title")}</h2>${o.noDone ? "" : `<button class="btn small" type="button">${ctx.t("settings.done")}</button>`}</div>${o.top ?? ""}<div class="body ${o.bodyClass ?? ""}" data-scroll>${o.body}</div></div>`;
}

export function section(id: string, title: string, body: string): string {
  return `<section class="sec" id="${id}" data-section><h3 class="sh">${title}</h3><div class="stack">${body}</div></section>`;
}

export function chev(): string {
  return `<span class="chev" aria-hidden="true"></span>`;
}

export function valueRow(label: string, value: string, go?: string, extra = ""): string {
  return `<button type="button" class="vrow"${go === undefined ? "" : ` data-go="${go}"`}><span class="l">${label}</span><span class="v">${value}</span>${chev()}</button>${extra}`;
}

export interface FrameSpec {
  readonly id: string;
  readonly label: string;
  readonly kind: Kind;
  readonly lang: Lang;
  readonly state?: string;
  readonly states?: readonly string[];
  readonly scrollTo?: string;
  readonly init?: string;
  readonly prefill?: string;
  readonly page?: boolean;
  readonly build: (ctx: Ctx) => string;
}

function backdrop(ctx: Ctx): string {
  if (ctx.kind === "phone" || ctx.kind === "small") {
    return `<div class="bd"><div class="bdbar"><span class="brand">${ctx.t("app.name")}</span><span class="bdicon">⚌</span></div><h1 class="bdh">${ctx.t("nav.practice")}</h1><div class="bdtext" lang="ar" dir="rtl">قَرَأَ الطَّالِبُ الكِتَابَ</div></div><div class="scrim"></div>`;
  }
  return `<div class="bd"><div class="bdbar"><span class="brand">${ctx.t("app.name")}</span><span class="bdnav"><i>${ctx.t("nav.recitation")}</i><i class="on">${ctx.t("nav.practice")}</i><i>${ctx.t("nav.custom")}</i><i>${ctx.t("nav.stats")}</i><i>${ctx.t("settings.title")}</i></span></div><h1 class="bdh">${ctx.t("nav.practice")}</h1><div class="bdtext" lang="ar" dir="rtl">قَرَأَ الطَّالِبُ الكِتَابَ</div></div><div class="scrim"></div>`;
}

export function frame(spec: FrameSpec, boardId: string): string {
  const ctx = makeCtx(spec.lang, spec.kind);
  const states = (spec.states ?? [spec.state ?? ""]).join(" ");
  const inner = spec.page ? spec.build(ctx) : `${backdrop(ctx)}${spec.build(ctx)}`;
  return `<figure class="fig"><div class="frame ${spec.kind}${spec.page ? " pageframe" : ""}" data-frame data-mid="${boardId}-${spec.id}" data-states="${states}" data-state="${spec.state ?? ""}" ${spec.scrollTo === undefined ? "" : `data-scrollafter="${esc(spec.scrollTo)}"`} ${spec.prefill === undefined ? "" : `data-prefill="${spec.prefill}"`} ${spec.init === undefined ? "" : `data-init="${spec.init}"`} data-kbd="on" data-finger="on" data-labels="on" data-bs="on" data-vocal="auto" dir="${ctx.dir}" lang="${spec.lang}">${inner}</div><figcaption>${esc(spec.label)}</figcaption></figure>`;
}

export interface Board {
  readonly id: string;
  readonly letter: string;
  readonly title: string;
  readonly idea: string;
  readonly frames: readonly FrameSpec[];
  readonly facts: readonly (readonly [string, string])[];
  readonly worst: string;
  readonly extra?: string;
}

export function board(b: Board): string {
  const phoneKey = b.frames.find((spec) => spec.kind === "phone" && spec.lang === "en");
  const deskKey = b.frames.find((spec) => spec.kind === "desk");
  const read = (spec: FrameSpec | undefined): string =>
    spec === undefined ? "n/a" : `<b data-metric="${b.id}-${spec.id}">…</b> screens`;
  return `<article class="board" id="${b.id}"><header class="bh"><span class="badge">${b.letter}</span><div><h2>${esc(b.title)}</h2><p>${esc(b.idea)}</p></div></header><div class="frames">${b.frames.map((spec) => frame(spec, b.id)).join("")}</div><div class="facts"><dl>${b.facts
    .map(([term, text]) => `<div><dt>${esc(term)}</dt><dd>${esc(text)}</dd></div>`)
    .join("")}<div class="metric"><dt>Tallest pane</dt><dd>Phone ${read(phoneKey)} · Desktop ${read(deskKey)} · Today 2.8 and 2.9</dd></div><div class="worst"><dt>Worst at</dt><dd>${esc(b.worst)}</dd></div></dl>${b.extra ?? ""}</div></article>`;
}

export type FontMode = "local" | "google";

function fontFaces(mode: FontMode): string {
  if (mode === "google") {
    return "";
  }
  const base = "../../../../node_modules/@fontsource";
  const face = (family: string, pkg: string, file: string, weight: number): string =>
    `@font-face{font-family:"${family}";font-weight:${weight};src:url(${base}/${pkg}/files/${file}.woff2) format("woff2")}`;
  return [
    face("Scheherazade New", "scheherazade-new", "scheherazade-new-arabic-400-normal", 400),
    face("Amiri", "amiri", "amiri-arabic-400-normal", 400),
    face("Noto Naskh Arabic", "noto-naskh-arabic", "noto-naskh-arabic-arabic-400-normal", 400),
    face("Noto Naskh Arabic", "noto-naskh-arabic", "noto-naskh-arabic-arabic-600-normal", 600),
  ].join("");
}

export function page(title: string, content: string, mode: FontMode, extraCss = ""): string {
  const googleLink =
    mode === "google"
      ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri&family=Noto+Naskh+Arabic:wght@400;600&family=Scheherazade+New&display=swap">`
      : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${googleLink}<style>${fontFaces(mode)}${CSS.replace(/font-size:(\d+(?:\.\d+)?)px/g, "font-size:calc($1px*var(--ts,1))")}${extraCss}</style></head><body>${content}<script>${SCRIPT}</script></body></html>`;
}

export const CSS = `
:root{--page:#08090b;--surface:#101114;--ink:#ebe8e2;--muted:#8f9299;--line:#23262b;--edge:#6b6f77;--faint:#14161a;--accent:#e2b062;--on-accent:#1a1408;--danger:#fca5a5;--focus:#93c5fd}
*{box-sizing:border-box}
body{margin:0;background:#040506;color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
[lang=ar]{font-family:"Noto Naskh Arabic","Segoe UI",system-ui,sans-serif}
button,input,select{font:inherit;color:inherit}
[hidden]{display:none!important}
summary{list-style:none;cursor:pointer}
summary::-webkit-details-marker{display:none}
details[open]>summary .chev{transform:rotate(225deg)!important}
.body.nopad{padding:0;gap:0;flex-direction:row}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.boardwrap{width:2140px;max-width:none;margin:0 auto;padding:40px}
.board{margin:0 0 72px;padding:32px;border:1px solid var(--line);border-radius:24px;background:#0a0b0d}
.bh{display:flex;gap:20px;align-items:center;margin-bottom:24px}
.bh h2{margin:0;font-size:30px;font-weight:600}
.bh p{margin:4px 0 0;color:var(--muted);font-size:18px;max-width:1400px}
.badge{display:grid;place-items:center;width:56px;height:56px;border-radius:16px;background:var(--accent);color:var(--on-accent);font-size:28px;font-weight:700;flex:none}
.frames{display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap}
.fig{margin:0}
.fig figcaption{margin-top:10px;color:var(--muted);font-size:15px;max-width:390px}
.fig:has(.desk) figcaption{max-width:1152px}
.facts{margin-top:28px}
.facts dl{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 28px;margin:0}
.facts dl>div{padding:14px 18px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
.facts dt{color:var(--accent);font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.facts dd{margin:0;font-size:16px}
.facts .worst dd{color:var(--danger)}
.frame{position:relative;overflow:hidden;background:var(--page);border:1px solid var(--line);flex:none}
.frame.phone{width:390px;height:844px;border-radius:30px}
.frame.desk{width:1440px;height:900px;border-radius:12px;zoom:.8}
body.measure .frame.desk{zoom:1}
.bd{position:absolute;inset:0;padding:12px 20px;color:#34373d}
.bdbar{display:flex;justify-content:space-between;align-items:center;height:44px}
.brand{font-size:22px;color:#3d4046}
.bdnav{display:flex;gap:36px;font-size:15px}
.bdnav .on{color:#4b4e55}
.bdh{font-size:32px;font-weight:400;margin:40px 0 0}
.desk .bdh{margin-inline-start:6%}
.bdtext{font-family:"Scheherazade New",serif;font-size:56px;text-align:center;margin-top:120px;filter:blur(3px)}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.6)}
.sheet{position:absolute;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);color:var(--ink);overflow:hidden}
.phone .sheet,.small .sheet{inset-inline:0;bottom:0;max-height:760px;border-radius:24px 24px 0 0}
.desk .sheet,.tab .sheet{inset:0;margin:auto;width:var(--w,512px);height:fit-content;max-height:810px;border-radius:16px}
.sheet.fixed{height:var(--h)}
.grab{display:block;width:40px;height:4px;border-radius:2px;background:var(--edge);margin:8px auto 0;flex:none}
.dhead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 16px;border-bottom:1px solid var(--line);flex:none}
.dhead h2{margin:0;font-size:18px;font-weight:500;flex:1}
.body{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:20px;scrollbar-width:none}
.body::-webkit-scrollbar{display:none}
.stack{display:flex;flex-direction:column;gap:18px}
.btn{min-height:44px;border-radius:12px;border:1px solid var(--line);background:transparent;padding:0 18px;font-size:14px;font-weight:500;cursor:pointer}
.btn.small{min-height:36px;padding:0 14px}
.btn:hover{background:var(--faint)}
.btn.danger{border-color:rgba(252,165,165,.5);color:var(--danger)}
.btnrow{display:flex;gap:10px;flex-wrap:wrap}
.set{border:0;margin:0;padding:0;min-width:0;display:flex;flex-direction:column;gap:8px}
.set.gap{gap:14px}
.lab{font-weight:600;font-size:15px;padding:0}
.hint{color:var(--muted);font-size:13px;line-height:1.45;margin:0;display:block}
.l{font-weight:500;font-size:15px}
.seg{display:inline-flex;flex-wrap:wrap;gap:4px;border:1px solid var(--line);border-radius:14px;padding:4px;width:fit-content;max-width:100%}
.seg.full{display:flex;width:100%}
.seg.full label{flex:1}
.seg label{position:relative;display:flex}
.seg input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
.seg span{display:flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid transparent;color:var(--muted);font-size:14px;width:100%;text-align:center}
.seg input:checked+span{border-color:rgba(226,176,98,.6);background:var(--faint);color:var(--accent)}
.seg input:focus-visible+span{outline:2px solid var(--focus);outline-offset:2px}
.radios{display:flex;flex-direction:column}
.radio{display:flex;gap:12px;min-height:44px;padding:6px 0;align-items:flex-start;cursor:pointer}
.radio input{position:absolute;opacity:0}
.rb{position:relative;flex:none;width:20px;height:20px;border-radius:50%;border:1px solid var(--edge);margin-top:2px}
.rb::before{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--accent);opacity:0}
.radio input:checked+.rb{border-color:var(--accent)}
.radio input:checked+.rb::before{opacity:1}
.rt{display:flex;flex-direction:column;min-width:0}
.fsample{font-size:24px;line-height:1.9}
.swlist{display:flex;flex-direction:column}
.swrow{display:flex;gap:14px;align-items:flex-start;min-height:44px;padding:8px 0;cursor:pointer}
.sw{appearance:none;-webkit-appearance:none;flex:none;margin:2px 0 0;width:46px;height:26px;border-radius:13px;background:#2a2d33;position:relative;cursor:pointer}
.sw::before{content:"";position:absolute;top:3px;inset-inline-start:3px;width:20px;height:20px;border-radius:50%;background:var(--ink);transition:none}
.sw:checked{background:var(--accent)}
.sw:checked::before{inset-inline-start:23px;background:var(--on-accent)}
.rangerow{display:flex;align-items:center;gap:12px;min-height:44px}
.rangerow input{flex:1;accent-color:var(--accent);height:44px;margin:0}
.rangerow output{width:32px;text-align:end;font-variant-numeric:tabular-nums}
.chips{display:flex;gap:8px}
.fchip{flex:1;position:relative;display:flex}
.fchip input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
.fchip span{flex:1;display:flex;flex-direction:column;align-items:center;gap:0;padding:6px 6px 8px;border:1px solid var(--line);border-radius:12px;min-width:0;text-align:center}
.fchip b{font-size:26px;font-weight:400;line-height:1.6}
.fchip i{font-style:normal;font-size:12px;color:var(--muted);line-height:1.2}
.fchip input:checked+span{border-color:rgba(226,176,98,.7);background:var(--faint)}
.fchip input:checked+span i{color:var(--accent)}
.sample{font-family:var(--lesson-font,"Scheherazade New"),serif;font-size:calc(var(--lesson-size,40px)*.6);line-height:2;text-align:center;border:1px solid var(--line);border-radius:12px;background:var(--faint);padding:2px 8px;overflow:hidden}
[data-frame]{--lesson-size:40px}
.cache{display:flex;align-items:center;justify-content:space-between;gap:12px}
.about{display:flex;align-items:center;min-height:44px;color:var(--muted);font-size:14px;text-decoration:underline;text-underline-offset:4px;width:fit-content}
.sh{margin:0 0 12px;font-size:13px;letter-spacing:.07em;text-transform:uppercase;color:var(--accent);font-weight:600}
[lang=ar] .sh{letter-spacing:0;text-transform:none;font-size:15px}
.sec+.sec{padding-top:4px}
.tabs{display:flex;gap:2px;overflow-x:auto;padding:0 12px;border-bottom:1px solid var(--line);flex:none;scrollbar-width:none}
.tab{flex:none;min-height:46px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:none;color:var(--muted);font-size:14px;cursor:pointer;white-space:nowrap}
.tab.on{color:var(--accent);border-bottom-color:var(--accent)}
.jump{display:flex;gap:8px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid var(--line);flex:none;scrollbar-width:none}
.pill{flex:none;min-height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--line);background:none;color:var(--muted);font-size:13px;cursor:pointer;white-space:nowrap}
.pill.on{color:var(--accent);border-color:rgba(226,176,98,.6)}
.vrow{display:flex;align-items:center;gap:12px;min-height:56px;width:100%;padding:8px 2px;background:none;border:0;border-bottom:1px solid var(--line);text-align:start;cursor:pointer}
.vrow .l{flex:1}
.vrow .v{color:var(--muted);font-size:14px;text-align:end;max-width:55%}
.chev{display:inline-block;flex:none;width:9px;height:9px;margin-inline:5px;border-right:2px solid var(--edge);border-bottom:2px solid var(--edge);transform:rotate(-45deg);font-size:0}
[dir=rtl] .chev{transform:rotate(135deg)}
.vrows{display:flex;flex-direction:column}
.vrows .vrow:last-child{border-bottom:0}
.acc{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.acc+.acc{margin-top:-8px}
.acch{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:8px 14px;background:none;border:0;text-align:start;cursor:pointer}
.acch .tt{flex:1;display:flex;flex-direction:column}
.acch .tt b{font-weight:600;font-size:15px}
.acch .tt small{color:var(--muted);font-size:13px}
.acch .chev,.pill .chev,[dir=rtl] .acch .chev,[dir=rtl] .pill .chev{transform:rotate(45deg)}
.acch.on .chev{transform:rotate(225deg)!important}
.accb{padding:4px 14px 16px;display:flex;flex-direction:column;gap:18px;border-top:1px solid var(--line);padding-top:16px}
.back{display:flex;align-items:center;gap:4px;min-height:44px;padding:0 8px;background:none;border:0;color:var(--accent);font-size:15px;cursor:pointer}
.back .chev{transform:rotate(135deg);border-color:var(--accent)}
[dir=rtl] .back .chev{transform:rotate(-45deg)}
.search{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border:1px solid var(--edge);border-radius:14px;background:var(--faint);flex:none}
.search input{flex:1;background:none;border:0;outline:0;min-width:0;font-size:16px}
.search span{color:var(--muted)}
.searchwrap{padding:12px 16px;border-bottom:1px solid var(--line);flex:none}
.empty{color:var(--muted);text-align:center;padding:24px 0}
.preview{border:1px solid var(--line);border-radius:16px;background:var(--faint);padding:14px 14px 12px;display:flex;flex-direction:column;gap:10px;margin:12px 16px 0;flex:none}
.pvlabel{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.pvtext{font-family:var(--lesson-font,"Scheherazade New"),serif;font-size:calc(var(--lesson-size,40px)*.72);line-height:1.9;text-align:center;direction:rtl}
.pvtext .done{color:#5b5d61}
.pvtext .cur{border-bottom:2px solid var(--accent)}
.pvtext .up{color:var(--muted)}
.pvtext .wrong{color:var(--danger);display:inline-block;line-height:1.5;padding:0 3px;border-bottom:2px solid var(--danger);background:rgba(252,165,165,.12);border-radius:4px}
[data-vocal=letters] .pvtext .mk{opacity:.3}
.pvnote{font-size:13px;color:var(--muted);text-align:center}
[data-bs=on] .bsoff,[data-bs=off] .bson{display:none}
.kbd{display:flex;flex-direction:column;gap:4px;align-items:center;direction:ltr}
[data-kbd=off] .kbd{display:none}
.krow{display:flex;gap:4px}
.key{width:24px;height:26px;border-radius:6px;border:1px solid var(--line);display:grid;place-items:center;font-size:12px;color:var(--muted)}
.key.hot{border-color:var(--accent);color:var(--accent);background:rgba(226,176,98,.1)}
.fingernote{font-size:12px;color:var(--accent);text-align:center}
[data-finger=off] .fingernote{display:none}
.ctx{display:flex;gap:8px;align-items:center;color:var(--accent);font-size:13px;padding:10px 16px 0;flex:none}
.ctx i{font-style:normal;padding:2px 10px;border:1px solid rgba(226,176,98,.5);border-radius:10px}
.pagebody{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--page)}
.apphead{display:flex;justify-content:space-between;align-items:center;padding:8px 24px;height:56px;flex:none;border-bottom:1px solid var(--line)}
.apphead .brand{color:var(--ink)}
.appnav{display:flex;gap:28px;font-size:15px;color:var(--muted)}
.appnav .on{color:var(--ink);border-bottom:2px solid var(--accent);padding-bottom:6px}
.pagemain{flex:1;min-height:0;overflow-y:auto;padding:24px;scrollbar-width:none}
.pagemain::-webkit-scrollbar{display:none}
.tabbar{display:flex;border-top:1px solid var(--line);flex:none;height:60px}
.tabbar span{flex:1;display:grid;place-items:center;font-size:12px;color:var(--muted)}
.tabbar .on{color:var(--accent)}
.cards{columns:2;column-gap:20px}
.cards .card{break-inside:avoid;margin-bottom:20px}
.card{border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:18px 20px;display:flex;flex-direction:column;gap:16px}
.card h3{margin:0;font-size:17px;font-weight:600}
.pagegrid{display:grid;grid-template-columns:220px 1fr;gap:32px;max-width:1180px;margin:0 auto}
.sidenav{display:flex;flex-direction:column;gap:2px;position:sticky;top:0;align-self:start}
.sidenav button{min-height:44px;border-radius:10px;padding:0 14px;background:none;border:0;text-align:start;color:var(--muted);font-size:15px;cursor:pointer}
.sidenav button.on{background:var(--faint);color:var(--accent)}
.rail{width:210px;flex:none;border-inline-end:1px solid var(--line);padding:8px;display:flex;flex-direction:column;gap:2px;overflow:auto}
.rail button{display:flex;flex-direction:column;align-items:flex-start;gap:0;min-height:56px;border-radius:10px;padding:6px 12px;background:none;border:0;text-align:start;color:var(--muted);cursor:pointer}
.rail button b{font-weight:500;font-size:15px;color:var(--ink)}
.rail button small{font-size:12px}
.rail button.on{background:var(--faint)}
.rail button.on b{color:var(--accent)}
.split{display:flex;min-height:0;flex:1}
.pane{flex:1;min-width:0;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:20px;scrollbar-width:none}
.pane h3{margin:0;font-size:20px;font-weight:600}
.cols{columns:2;column-gap:28px}
.cols>section{break-inside:avoid;margin-bottom:22px}
.compare{display:flex;flex-wrap:wrap;gap:24px}
.cmp{width:420px;border:1px solid var(--line);border-radius:18px;padding:22px;background:var(--surface);display:flex;flex-direction:column;gap:16px}
.cmpbody{display:flex;flex-direction:column;gap:14px}
.cmp h3{margin:0;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.cmp.after h3{color:var(--accent)}
.cmpnum{font-size:15px;color:var(--muted)}
.cmpnum b{color:var(--ink);font-size:22px}
.gtable{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.gcol{border:1px solid var(--line);border-radius:18px;padding:20px;background:var(--surface)}
.gcol h3{margin:0 0 4px;font-size:20px}
.gcol p.sub{margin:0 0 14px;color:var(--muted);font-size:14px}
.gg{margin:10px 0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--faint)}
.gg b{display:block;font-size:15px;margin-bottom:6px}
.gg span{display:inline-block;margin:2px 4px 2px 0;padding:2px 10px;border-radius:12px;border:1px solid var(--line);font-size:13px;color:var(--muted)}
.gg span.q{border-color:rgba(226,176,98,.6);color:var(--accent)}
.gcol .cost{margin-top:12px;font-size:14px;color:var(--danger)}
.todayimgs{display:flex;gap:20px;flex-wrap:wrap}
.todayimgs img{width:300px;border:1px solid var(--line);border-radius:18px}
.nav{position:sticky;top:0;z-index:5;display:flex;gap:10px;flex-wrap:wrap;padding:14px 40px;background:rgba(4,5,6,.92);border-bottom:1px solid var(--line);width:2140px;margin:0 auto}
.nav a{color:var(--muted);text-decoration:none;padding:6px 14px;border:1px solid var(--line);border-radius:12px;font-size:14px}
.nav a b{color:var(--accent);margin-inline-end:6px}
.intro{padding:24px 0 36px}
.intro h1{margin:0 0 8px;font-size:36px;font-weight:600}
.intro p{margin:6px 0;color:var(--muted);font-size:18px;max-width:1500px}
.intro p b{color:var(--ink)}
`;

export const SCRIPT = `
(function(){
var SIZES=[28,32,36,40,44,48,56,64,72];
function apply(f){
  var s=f.dataset.state||'';
  f.querySelectorAll('[data-only]').forEach(function(e){e.hidden=e.dataset.only.split(' ').indexOf(s)<0;});
  f.querySelectorAll('[data-on]').forEach(function(e){e.classList.toggle('on',e.dataset.on.split(' ').indexOf(s)>=0);});
}
function flags(f){
  f.querySelectorAll('[data-flag]').forEach(function(c){f.dataset[c.dataset.flag]=c.checked?'on':'off';});
}
document.addEventListener('click',function(ev){
  var go=ev.target.closest('[data-go]');
  if(go){
    var f=go.closest('[data-frame]');
    if(f){
      var next=go.dataset.go;
      f.dataset.state=(go.hasAttribute('data-toggle')&&f.dataset.state===next)?'':next;
      apply(f);
      var body=f.querySelector('[data-scroll]');
      if(body&&go.hasAttribute('data-top')){body.scrollTop=0;}
    }
  }
  var jump=ev.target.closest('[data-scrollto]');
  if(jump){
    var f2=jump.closest('[data-frame]');
    var t=f2.querySelector(jump.dataset.scrollto);
    var b=f2.querySelector('[data-scroll]');
    if(t&&b){b.scrollTo({top:t.offsetTop-b.offsetTop-8});}
    f2.querySelectorAll('[data-scrollto]').forEach(function(p){p.classList.toggle('on',p===jump);});
  }
});
document.addEventListener('input',function(ev){
  var e=ev.target,f=e.closest('[data-frame]');
  if(!f){return;}
  if(e.matches('[data-size]')){
    var px=SIZES[Number(e.value)];
    f.style.setProperty('--lesson-size',px+'px');f.style.setProperty('--lesson-n',px);
    f.querySelectorAll('[data-size-out]').forEach(function(o){o.textContent=new Intl.NumberFormat(f.lang==='ar'?'ar-u-nu-arab':'en').format(px);});
  }
  if(e.matches('[data-font]')){f.style.setProperty('--lesson-font','"'+e.dataset.font+'"');}
  if(e.matches('[data-hintbox]')){
    var box=f.querySelector('[data-hintfor="'+e.dataset.hintbox+'"]');
    if(box){box.textContent=e.dataset.hint;}
  }
  if(e.matches('[data-pv-vocal]')){f.dataset.vocal=e.dataset.vocal;}
  if(e.matches('[data-flag]')){f.dataset[e.dataset.flag]=e.checked?'on':'off';}
  if(e.matches('[data-search]')){
    var q=e.value.trim().toLowerCase(),any=false;
    f.querySelectorAll('[data-item]').forEach(function(it){
      var show=q===''||it.dataset.kw.toLowerCase().indexOf(q)>=0;
      it.hidden=!show;
      if(show){any=true;}
    });
    f.querySelectorAll('[data-section]').forEach(function(sec){
      sec.hidden=!sec.querySelector('[data-item]:not([hidden])');
    });
    f.querySelectorAll('[data-empty]').forEach(function(m){m.hidden=any;});
  }
});
document.querySelectorAll('[data-frame]').forEach(function(f){
  apply(f);flags(f);
  var pre=f.dataset.prefill;
  if(pre){var i=f.querySelector('[data-search]');i.value=pre;i.dispatchEvent(new Event('input',{bubbles:true}));}
  var init=f.dataset.init;
  if(init){init.split(';').forEach(function(pair){
    var kv=pair.split('='),k=kv[0],v=kv[1],el;
    if(k==='size'){el=f.querySelector('[data-size]');if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}}
    else if(k==='font'){f.querySelectorAll('[data-font]').forEach(function(r){if(r.dataset.font===v){r.checked=true;r.dispatchEvent(new Event('input',{bubbles:true}));}});}
    else if(k==='vocal'){f.querySelectorAll('[data-pv-vocal]').forEach(function(r){if(r.dataset.vocal===v){r.checked=true;r.dispatchEvent(new Event('input',{bubbles:true}));}});}
    else{el=f.querySelector('[data-flag="'+k+'"]');if(el){el.checked=false;el.dispatchEvent(new Event('input',{bubbles:true}));}}
  });}
  var after=f.dataset.scrollafter;
  if(after){
    var t=f.querySelector(after),b=f.querySelector('[data-scroll]');
    if(t&&b){b.scrollTop=t.offsetTop-b.offsetTop-8;}
  }
});
})();
`;
