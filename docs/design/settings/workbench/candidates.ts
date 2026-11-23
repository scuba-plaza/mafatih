import { ar } from "../../../../src/i18n/ar.ts";
import { en, type MessageKey } from "../../../../src/i18n/en.ts";
import {
  aboutLink,
  ayatSeg,
  backspaceSwitch,
  backupBlock,
  type Board,
  cacheBlock,
  cacheRow,
  type Ctx,
  chev,
  dialog,
  esc,
  fontChips,
  fontRadios,
  type FrameSpec,
  type Group,
  type GroupId,
  group,
  groupsFor,
  guideSwitches,
  languageSeg,
  lessonText,
  makeCtx,
  orderSeg,
  radios as radioList,
  reciterSeg,
  resetButton,
  sampleLine,
  section,
  slider,
  sw,
  unlockButton,
  valueRow,
  vocalRadios,
  vocalSeg,
} from "./lib.ts";

type Build = (ctx: Ctx) => string;

const phone = (id: string, label: string, build: Build, extra: Partial<FrameSpec> = {}): FrameSpec => ({
  id,
  label,
  kind: "phone",
  lang: "en",
  build,
  ...extra,
});
const desk = (id: string, label: string, build: Build, extra: Partial<FrameSpec> = {}): FrameSpec => ({
  id,
  label,
  kind: "desk",
  lang: "en",
  build,
  ...extra,
});
const arabic = (id: string, label: string, build: Build, extra: Partial<FrameSpec> = {}): FrameSpec => ({
  id,
  label,
  kind: "phone",
  lang: "ar",
  build,
  ...extra,
});

const ids = (ctx: Ctx): readonly GroupId[] => groupsFor(ctx.kind).map((g) => g.id);
const idList = (ctx: Ctx): string => ids(ctx).join(" ");

function sections(ctx: Ctx, prefix: string): string {
  return groupsFor(ctx.kind)
    .map((g) => section(`${prefix}-${g.id}`, g.title(ctx), g.body(ctx)))
    .join("");
}

function jump(ctx: Ctx, prefix: string): string {
  return `<div class="jump">${groupsFor(ctx.kind)
    .map(
      (g, index) =>
        `<button type="button" class="pill${index === 0 ? " on" : ""}" data-scrollto="#${prefix}-${g.id}">${g.short(ctx)}</button>`,
    )
    .join("")}</div>`;
}

const boardA: Board = {
  id: "A",
  letter: "A",
  title: "One scroll, regrouped, with a jump bar",
  idea: "Keep the single list, but put the controls in six logical sections with clear headings, shrink the tall parts, and pin a row of jump chips under the title so nothing is ever far away.",
  frames: [
    phone("phone", "Phone: the jump bar stays under the title while you scroll.", (ctx) => {
      const p = ctx.uid("a");
      return dialog(ctx, { top: jump(ctx, p), body: sections(ctx, p) });
    }),
    phone(
      "phone2",
      "Phone: after tapping “Recitation”.",
      (ctx) => {
        const p = ctx.uid("a");
        return dialog(ctx, { top: jump(ctx, p), body: sections(ctx, p) });
      },
      { scrollTo: '[id$="-recitation"]' },
    ),
    desk(
      "desk",
      "Desktop: a wide dialog sets the sections in two columns, so almost nothing needs scrolling.",
      (ctx) => {
        const p = ctx.uid("a");
        return dialog(ctx, { width: 920, top: jump(ctx, p), body: `<div class="cols">${sections(ctx, p)}</div>` });
      },
    ),
    arabic("ar", "Arabic, right to left.", (ctx) => {
      const p = ctx.uid("a");
      return dialog(ctx, { top: jump(ctx, p), body: sections(ctx, p) });
    }),
  ],
  facts: [
    ["A first-time learner sees", "Everything, in order, with section names. It reads like one page."],
    ["Taps to reach", "Lesson font: 1 (chip). Reset progress: 1 (chip), then a scroll."],
  ],
  worst: "It is still a scroll. The jump chips help you leave, not arrive, and six chips need sideways scrolling at 320 px.",
};

function listRows(ctx: Ctx): string {
  return `<div class="vrows" data-only="list">${groupsFor(ctx.kind)
    .map((g) => valueRow(g.title(ctx), g.summary(ctx), g.id))
    .join("")}</div>`;
}

function detailPanels(ctx: Ctx, withTitle: boolean): string {
  return groupsFor(ctx.kind)
    .map(
      (g) =>
        `<div class="stack" data-only="${g.id}">${withTitle ? `<h3>${g.title(ctx)}</h3>` : ""}${g.body(ctx)}</div>`,
    )
    .join("");
}

function titleSwitch(ctx: Ctx): string {
  return `<span data-only="list">${ctx.t("settings.title")}</span>${groupsFor(ctx.kind)
    .map((g) => `<span data-only="${g.id}">${g.title(ctx)}</span>`)
    .join("")}`;
}

function drillIn(ctx: Ctx): string {
  return dialog(ctx, {
    titleHtml: titleSwitch(ctx),
    lead: `<button class="back" type="button" data-go="list" data-top data-only="${idList(ctx)}"><span class="chev" aria-hidden="true"></span>${ctx.m("back")}</button>`,
    body: `${listRows(ctx)}${detailPanels(ctx, false)}`,
  });
}

function masterDetail(ctx: Ctx): string {
  const rail = groupsFor(ctx.kind)
    .map(
      (g) =>
        `<button type="button" data-go="${g.id}" data-on="${g.id}"><b>${g.title(ctx)}</b><small>${g.summary(ctx)}</small></button>`,
    )
    .join("");
  return dialog(ctx, {
    width: 820,
    height: 600,
    bodyClass: "nopad",
    body: `<div class="split"><nav class="rail">${rail}</nav><div class="pane">${detailPanels(ctx, true)}</div></div>`,
  });
}

const allStates = (kind: "phone" | "desk"): readonly string[] => [
  "list",
  ...groupsFor(kind).map((g) => g.id),
];

const boardB: Board = {
  id: "B",
  letter: "B",
  title: "Master and detail",
  idea: "A short list of groups, each showing its current value. Tap a group to open just that group's controls. On a wide screen the list becomes a side rail and the controls sit beside it.",
  frames: [
    phone("phone", "Phone: the list. Every group says what it is currently set to.", drillIn, {
      state: "list",
      states: allStates("phone"),
    }),
    phone("phone2", "Phone: inside “Lesson text”. The back button names where you came from.", drillIn, {
      state: "lesson",
      states: allStates("phone"),
    }),
    desk("desk", "Desktop: rail on the left, the chosen group on the right. Nothing scrolls.", masterDetail, {
      state: "lesson",
      states: allStates("desk"),
    }),
    arabic("ar", "Arabic: the chevrons and the back arrow turn around.", drillIn, {
      state: "list",
      states: allStates("phone"),
    }),
  ],
  facts: [
    ["A first-time learner sees", "Six rows with their values. The whole map of Settings fits on one screen."],
    ["Taps to reach", "Lesson font: 2 (group, then chip). Reset progress: 2 (group, then button)."],
  ],
  worst: "Two taps for everything, and the back-and-forth costs time when you change several things in different groups.",
};

function tabs(ctx: Ctx): string {
  const buttons = groupsFor(ctx.kind)
    .map(
      (g) =>
        `<button type="button" role="tab" class="tab" data-go="${g.id}" data-on="${g.id}">${g.short(ctx)}</button>`,
    )
    .join("");
  return `<div class="tabs" role="tablist">${buttons}</div>`;
}

function tabbed(height: number, width?: number): Build {
  return (ctx) =>
    dialog(ctx, {
      height,
      width,
      top: tabs(ctx),
      body: groupsFor(ctx.kind)
        .map((g) => `<div class="stack" data-only="${g.id}">${g.body(ctx)}</div>`)
        .join(""),
    });
}

const boardC: Board = {
  id: "C",
  letter: "C",
  title: "Tabs",
  idea: "A tab strip under the title. One pane at a time, and the dialog keeps the same height whichever tab you are on, so it never jumps.",
  frames: [
    phone("phone", "Phone: “Text” tab.", tabbed(640), {
      state: "lesson",
      states: groupsFor("phone").map((g) => g.id),
    }),
    phone("phone2", "Phone: “Recitation” tab.", tabbed(640), {
      state: "recitation",
      states: groupsFor("phone").map((g) => g.id),
    }),
    desk("desk", "Desktop: all six tabs fit; the dialog stays one size.", tabbed(620, 620), {
      state: "typing",
      states: groupsFor("desk").map((g) => g.id),
    }),
    arabic("ar", "Arabic: the tab strip starts from the right.", tabbed(640), {
      state: "typing",
      states: groupsFor("phone").map((g) => g.id),
    }),
  ],
  facts: [
    ["A first-time learner sees", "Five or six labels and one pane. Familiar from many apps."],
    ["Taps to reach", "Lesson font: 1. Reset progress: 1. Direct access to every group."],
  ],
  worst: "The current values are hidden until you open a tab, and five labels barely fit at 390 px; at 320 px the strip scrolls sideways.",
};

function accordion(ctx: Ctx): string {
  const rows = groupsFor(ctx.kind)
    .map(
      (g) =>
        `<div class="acc"><button type="button" class="acch" data-go="${g.id}" data-toggle data-on="${g.id}"><span class="tt"><b>${g.title(ctx)}</b><small>${g.summary(ctx)}</small></span>${chev()}</button><div class="accb" data-only="${g.id}">${g.body(ctx)}</div></div>`,
    )
    .join("");
  return dialog(ctx, { body: rows });
}

const boardD: Board = {
  id: "D",
  letter: "D",
  title: "Accordion with summaries",
  idea: "Every group is a header that says what it is set to. Open one and the others close, so you never lose your place.",
  frames: [
    phone("phone", "Phone: “Lesson text” open.", accordion, {
      state: "lesson",
      states: ["", ...groupsFor("phone").map((g) => g.id)],
    }),
    phone("phone2", "Phone: “Recitation” open.", accordion, {
      state: "recitation",
      states: ["", ...groupsFor("phone").map((g) => g.id)],
    }),
    desk("desk", "Desktop: same structure at a comfortable width.", accordion, {
      state: "typing",
      states: ["", ...groupsFor("desk").map((g) => g.id)],
    }),
    arabic("ar", "Arabic, everything folded: the overview a learner sees first.", accordion, {
      state: "",
      states: ["", ...groupsFor("phone").map((g) => g.id)],
    }),
  ],
  facts: [
    ["A first-time learner sees", "Headers with their values and one open group. Nothing to scroll past."],
    ["Taps to reach", "Lesson font: 1 (open Lesson text). Reset progress: 1 (open Progress and data)."],
  ],
  worst: "Opening a group moves the ones below it; a group that is tall when open pushes the next ones off screen.",
};

function kw(...keys: readonly MessageKey[]): string {
  return keys.map((key) => `${en[key]} ${ar[key]}`).join(" ");
}

interface Item {
  readonly kw: string;
  readonly html: string;
}

function itemsOf(ctx: Ctx, id: GroupId): readonly Item[] {
  switch (id) {
    case "general":
      return [
        { kw: kw("settings.language"), html: languageSeg(ctx) },
        { kw: kw("nav.about"), html: aboutLink(ctx) },
      ];
    case "lesson":
      return [
        { kw: `${kw("settings.font")} typeface`, html: `${fontChips(ctx)}${sampleLine()}` },
        { kw: `${kw("settings.fontSize")} size`, html: slider(ctx) },
      ];
    case "typing":
      return [
        { kw: `${kw("settings.vocalization")} marks tashkeel harakat`, html: vocalSeg(ctx) },
        { kw: `${kw("settings.backspace")} mistakes`, html: backspaceSwitch(ctx) },
      ];
    case "guide":
      return [{ kw: `${kw("settings.guide", "settings.showKeyboard", "settings.fingerGuide", "settings.keyLabels")} hint`, html: guideSwitches(ctx) }];
    case "recitation":
      return [
        { kw: `${kw("settings.ayatPerPassage")} passage`, html: ayatSeg(ctx) },
        { kw: kw("settings.surahOrder"), html: orderSeg(ctx) },
        { kw: `${kw("settings.reciter")} audio`, html: reciterSeg(ctx) },
        { kw: `${kw("audio.delete")} audio saved cache`, html: cacheBlock(ctx) },
      ];
    case "progress":
      return [
        { kw: `${kw("backup.title", "backup.download", "backup.choose")} restore`, html: backupBlock(ctx) },
        { kw: `${kw("settings.unlockLetters")} practice`, html: `<div class="set"><div class="lab">${ctx.t("settings.unlockLetters")}</div>${unlockButton(ctx)}</div>` },
        { kw: `${kw("settings.reset")} progress`, html: `<div class="set"><div class="lab">${ctx.t("settings.reset")}</div>${resetButton(ctx)}</div>` },
      ];
  }
}

function searchable(ctx: Ctx): string {
  const body = `<p class="empty" data-empty hidden>${ctx.m("noResults")}</p>${groupsFor(ctx.kind)
    .map((g) =>
      section(
        ctx.uid("s"),
        g.title(ctx),
        itemsOf(ctx, g.id)
          .map((item) => `<div data-item data-kw="${esc(item.kw)}">${item.html}</div>`)
          .join(""),
      ),
    )
    .join("")}`;
  const bar = `<div class="searchwrap"><label class="search"><span aria-hidden="true">⌕</span><input data-search type="search" placeholder="${ctx.m("search")}: ${ctx.m("searchHint")}" aria-label="${ctx.m("search")}"></label></div>`;
  return dialog(ctx, { top: bar, body });
}

const boardE: Board = {
  id: "E",
  letter: "E",
  title: "Search first",
  idea: "A search box sits on top. Type a word (font, backspace, audio, reset, or the Arabic word) and only the matching controls stay. With the box empty you get the grouped list.",
  frames: [
    phone("phone", "Phone: empty box, the grouped list (try typing).", searchable),
    phone("phone2", "Phone: after typing “audio”.", searchable, { prefill: "audio" }),
    desk("desk", "Desktop: after typing “key”.", searchable, { prefill: "key" }),
    arabic("ar", "Arabic: searching “خط”. Both languages match.", searchable, { prefill: "خط" }),
  ],
  facts: [
    ["A first-time learner sees", "A box and the same list as A. The box is a shortcut for people who know the word."],
    ["Taps to reach", "Lesson font: 2 (focus box, type “font”). Reset progress: same, then one tap."],
  ],
  worst: "Does nothing for the person who does not know what to call it, and the empty state is as long as today's list. It works best added to another idea.",
};

const MARKS = /([ً-ْ])/g;
const mk = (text: string): string => text.replace(MARKS, '<span class="mk">$1</span>');

function keyboardStrip(ctx: Ctx): string {
  const row = (letters: string, hot?: string): string =>
    `<div class="krow">${[...letters].map((letter) => `<span class="key${letter === hot ? " hot" : ""}">${letter}</span>`).join("")}</div>`;
  return `<div class="kbd">${row("ضصثقفغعهخح")}${row("شسيبلاتنمك", "ب")}${row("ئءؤرلاىةوز")}</div><div class="fingernote">${ctx.m("next")}: ب · ${ctx.m("leftMiddle")}</div>`;
}

function previewCard(ctx: Ctx, withKeyboard: boolean): string {
  return `<div class="preview"><div class="pvlabel"><span>${ctx.m("previewTitle")}</span><span>${ctx.t("settings.vocalization")}</span></div><div class="pvtext" lang="ar" dir="rtl">${mk('<span class="done">كَتَ</span>')}<span class="wrong bson">ر</span>${mk('<span class="cur up">بَ</span><span class="up"> الوَلَدُ الدَّرْسَ</span>')}</div><div class="pvnote"><span class="bson">${ctx.m("previewMistake")}</span><span class="bsoff">${ctx.m("previewBlocked")}</span></div>${withKeyboard ? keyboardStrip(ctx) : ""}</div>`;
}

function previewControls(ctx: Ctx): string {
  const rest = [
    valueRow(ctx.t("settings.language"), ctx.lang === "ar" ? "العربية" : "English"),
    valueRow(ctx.t("settings.recitation"), `${ctx.t("reciter.murattal")} · ${ctx.n(4)} ${ctx.m("ayat")}`),
    valueRow(ctx.t("backup.title"), ""),
  ].join("");
  return `${section(ctx.uid("p"), ctx.m("gLesson"), `${fontChips(ctx)}${slider(ctx)}`)}${section(ctx.uid("p"), ctx.m("gTyping"), `${vocalSeg(ctx, true)}${backspaceSwitch(ctx)}`)}${ctx.kind === "desk" ? section(ctx.uid("p"), ctx.m("gGuide"), guideSwitches(ctx)) : ""}${section(`${ctx.uid("p")}-more`, ctx.m("allSettings"), `<div class="vrows">${rest}</div>`)}`;
}

function previewFirst(ctx: Ctx): string {
  if (ctx.kind === "desk") {
    return dialog(ctx, {
      width: 980,
      height: 640,
      bodyClass: "nopad",
      body: `<div class="split"><div style="width:420px;flex:none;border-inline-end:1px solid var(--line);padding-bottom:16px">${previewCard(ctx, true)}</div><div class="pane">${previewControls(ctx)}</div></div>`,
    });
  }
  return dialog(ctx, { top: previewCard(ctx, false), body: previewControls(ctx) });
}

const boardF: Board = {
  id: "F",
  letter: "F",
  title: "Preview first",
  idea: "A live sample of a lesson line is pinned at the top. Font, size, marks, mistake behaviour and the keyboard guide all change it as you touch them. The settings that cannot be previewed are listed beneath.",
  frames: [
    phone("phone", "Phone: the sample is pinned; the controls scroll under it. Try the font, size and marks.", previewFirst),
    phone("phone2", "Phone: scrolled to the settings with no preview.", previewFirst, { scrollTo: '[id$="-more"]' }),
    desk("desk", "Desktop: preview and mini keyboard on the left, controls on the right.", previewFirst),
    arabic("ar", "Arabic.", previewFirst),
  ],
  facts: [
    ["A first-time learner sees", "Their own lesson text, and what each choice does to it. Fewer words are needed because the effect is visible."],
    ["Taps to reach", "Lesson font: 1. Reset progress: 2 (More rows, then a screen)."],
  ],
  worst: "The preview takes a fifth of a phone screen. Recitation, audio and data settings do not belong to the preview and end up in a second-class list.",
};

function contextual(first: readonly GroupId[], chipKey: "pRecitation" | "pPractice") {
  return (ctx: Ctx): string => {
    const lead = first
      .map((id) => section(ctx.uid("c"), `${ctx.m("forPage")} · ${group(id).title(ctx)}`, group(id).body(ctx)))
      .join("");
    const rest = groupsFor(ctx.kind)
      .filter((g) => !first.includes(g.id))
      .map(
        (g) =>
          `<details class="acc"><summary class="acch"><span class="tt"><b>${g.title(ctx)}</b><small>${g.summary(ctx)}</small></span>${chev()}</summary><div class="accb">${g.body(ctx)}</div></details>`,
      )
      .join("");
    return dialog(ctx, {
      top: `<div class="ctx"><i>${ctx.m(chipKey)}</i></div>`,
      body: `${lead}${section(ctx.uid("c"), ctx.m("allSettings"), `<div class="stack" style="gap:10px">${rest}</div>`)}`,
    });
  };
}

const boardG: Board = {
  id: "G",
  letter: "G",
  title: "Contextual: open on what matters here",
  idea: "Settings opens with the groups that belong to the page you came from at the top, already open. Everything else is one tap away as folded rows below.",
  frames: [
    phone("phone", "Phone: opened from Recitation, so Recitation and Lesson text lead.", contextual(["recitation", "lesson"], "pRecitation")),
    phone("phone2", "Phone: opened from Practice, so Typing leads.", contextual(["typing"], "pPractice")),
    desk("desk", "Desktop: opened from Practice.", contextual(["typing", "lesson"], "pPractice")),
    arabic("ar", "Arabic: opened from Recitation.", contextual(["recitation", "lesson"], "pRecitation")),
  ],
  facts: [
    ["A first-time learner sees", "The settings for what they were just doing. The rest is hidden but listed."],
    ["Taps to reach", "A relevant setting: 0. Anything else: 1 (open a folded row)."],
  ],
  worst: "Settings changes shape depending on where you open it, so what you found yesterday is not where it is today. Hard to learn, hard to document.",
};

function card(ctx: Ctx, g: Group, id: string): string {
  return `<section class="card" id="${id}"><h3>${g.title(ctx)}</h3>${g.body(ctx)}</section>`;
}

function pageBuild(ctx: Ctx): string {
  const list = groupsFor(ctx.kind);
  if (ctx.kind === "phone") {
    return `<div class="pagebody"><div class="apphead"><span class="brand">${ctx.t("app.name")}</span><span>⚌</span></div><div class="pagemain" data-scroll><h1 style="margin:0 0 16px;font-size:28px;font-weight:500">${ctx.m("pageTitle")}</h1><div class="stack">${list.map((g) => card(ctx, g, `${ctx.uid("pg")}-${g.id}`)).join("")}</div></div><nav class="tabbar"><span>${ctx.m("navRecitation")}</span><span class="on">${ctx.m("navPractice")}</span><span>${ctx.m("navCustom")}</span><span>${ctx.m("navStats")}</span></nav></div>`;
  }
  const prefix = ctx.uid("pg");
  const nav = list
    .map(
      (g, index) =>
        `<button type="button" class="${index === 0 ? "on" : ""}" data-scrollto="#${prefix}-${g.id}">${g.title(ctx)}</button>`,
    )
    .join("");
  return `<div class="pagebody"><div class="apphead"><span class="brand">${ctx.t("app.name")}</span><span class="appnav"><span>${ctx.m("navRecitation")}</span><span>${ctx.m("navPractice")}</span><span>${ctx.m("navCustom")}</span><span>${ctx.m("navStats")}</span><span class="on">${ctx.m("pageTitle")}</span></span></div><div class="pagemain" data-scroll><div class="pagegrid"><nav class="sidenav"><h1 style="margin:0 0 12px;font-size:28px;font-weight:500">${ctx.m("pageTitle")}</h1>${nav}</nav><div class="cards">${list.map((g) => card(ctx, g, `${prefix}-${g.id}`)).join("")}</div></div></div></div>`;
}

const boardH: Board = {
  id: "H",
  letter: "H",
  title: "A page, not a dialog",
  idea: "Settings becomes its own screen (#/settings) with a side index on wide screens and a stack of cards on phones. It gets the whole window, and each group has a link of its own.",
  frames: [
    phone("phone", "Phone: a page with the tab bar visible, cards stacked.", pageBuild, { page: true }),
    phone("phone2", "Phone: scrolled to Recitation.", pageBuild, { page: true, scrollTo: '[id$="-recitation"]' }),
    desk("desk", "Desktop: index on the left, cards in two columns.", pageBuild, { page: true }),
    arabic("ar", "Arabic.", pageBuild, { page: true }),
  ],
  facts: [
    ["A first-time learner sees", "A normal page. Room to breathe; room for live samples and explanations."],
    ["Taps to reach", "Lesson font: 0 to 1. Reset progress: 1 on desktop, a scroll on phone."],
  ],
  worst: "It leaves the lesson. Changing the font and then looking at the text means going back and forth, and a page needs a route, a return path and focus handling the dialog gets for free.",
};

function valueRows(ctx: Ctx): string {
  return dialog(ctx, { width: ctx.kind === "desk" ? 560 : undefined, body: valueRowSections(ctx) });
}

function valueRowSections(ctx: Ctx): string {
  const sectionOf = (title: string, rows: string): string => `<section class="sec"><h3 class="sh">${title}</h3><div class="vrows">${rows}</div></section>`;
  const inline = (id: string, html: string): string => `<div class="stack" style="padding:6px 2px 14px" data-only="${id}">${html}</div>`;
  const row = (label: string, value: string, id: string, html: string): string =>
    `${valueRow(label, value, id).replace('data-go="', 'data-toggle data-go="')}${inline(id, html)}`;
  const plainSwitch = (label: string, flag?: string, checked = true): string => `<div class="vrow" style="cursor:default">${sw({ label, flag, checked })}</div>`;
  const guideRows =
    ctx.kind === "desk"
      ? sectionOf(
          ctx.m("gGuide"),
          [
            plainSwitch(ctx.t("settings.showKeyboard")),
            plainSwitch(ctx.t("settings.fingerGuide")),
            plainSwitch(ctx.t("settings.keyLabels")),
            plainSwitch(ctx.t("settings.delayedHint"), undefined, false),
          ].join(""),
        )
      : "";
  return [
    sectionOf(
      ctx.m("gGeneral"),
      `${row(ctx.t("settings.language"), ctx.lang === "ar" ? "العربية" : "English", "lang", languageSeg(ctx, true))}${valueRow(ctx.t("nav.about"), "")}`,
    ),
    sectionOf(
      ctx.m("gLesson"),
      `${row(ctx.t("settings.font"), "<bdi>Scheherazade New</bdi>", "font", `${fontChips(ctx)}${sampleLine()}`)}${row(ctx.t("settings.fontSize"), ctx.n(40), "size", `${slider(ctx)}${sampleLine()}`)}`,
    ),
    sectionOf(
      ctx.m("gTyping"),
      `${row(ctx.t("settings.vocalization"), ctx.t("vocalization.auto"), "vocal", vocalSeg(ctx))}${plainSwitch(ctx.t("settings.backspace"), "bs")}`,
    ),
    guideRows,
    sectionOf(
      ctx.m("gRecitation"),
      `${row(ctx.t("settings.ayatPerPassage"), ctx.n(4), "ayat", ayatSeg(ctx))}${row(ctx.t("settings.surahOrder"), ctx.t("order.mushaf"), "order", orderSeg(ctx))}${row(ctx.t("settings.reciter"), ctx.t("reciter.murattal"), "reciter", reciterSeg(ctx))}<div class="vrow" style="cursor:default"><span class="l" style="flex:1">${ctx.m("usageShort")}</span><button class="btn small" type="button">${ctx.m("deleteShort")}</button></div>`,
    ),
    sectionOf(
      ctx.m("gProgress"),
      `${row(ctx.t("backup.title"), "", "backup", backupBlock(ctx))}${row(ctx.t("settings.unlockLetters"), "", "unlock", unlockButton(ctx))}${row(ctx.t("settings.reset"), "", "reset", `<div class="hint">${ctx.t("settings.resetWarning")}</div>${resetButton(ctx)}`)}`,
    ),
  ].join("");
}

const rowStates = ["", "lang", "font", "size", "vocal", "ayat", "order", "reciter", "backup", "unlock", "reset"];

const boardI: Board = {
  id: "I",
  letter: "I",
  title: "Value rows",
  idea: "One quiet row per setting: its name on one side, its current value on the other. Tap a row and its picker opens right there under it. No list of radio buttons with hints is ever on screen all at once.",
  frames: [
    phone("phone", "Phone: the whole list as rows. Nothing is expanded.", valueRows, { states: rowStates }),
    phone("phone2", "Phone: “Lesson font” opened in place.", valueRows, { state: "font", states: rowStates }),
    desk("desk", "Desktop: “Vocalization” opened in place.", valueRows, { state: "vocal", states: rowStates }),
    arabic("ar", "Arabic.", valueRows, { states: rowStates }),
  ],
  facts: [
    ["A first-time learner sees", "A plain list, like their phone's own settings. Every current value is visible without opening anything."],
    ["Taps to reach", "Lesson font: 1. Reset progress: 2 (row, then button), after a scroll."],
  ],
  worst: "Still one list, so it still scrolls on a phone (about one and a half screens). Switches and rows mix two interaction patterns.",
};

function essentials(openId: GroupId | undefined) {
  return (ctx: Ctx): string => {
    const top = [
      languageSeg(ctx, true),
      `<div class="set gap">${sampleLine()}${slider(ctx)}</div>`,
      vocalSeg(ctx),
      ctx.kind === "desk" ? sw({ label: ctx.t("settings.showKeyboard"), flag: "kbd" }) : "",
    ].join("");
    const more: readonly { readonly id: GroupId | "detail"; readonly title: string; readonly summary: string; readonly body: string }[] = [
      {
        id: "detail",
        title: `${ctx.t("settings.font")} · ${ctx.m("gTyping")}`,
        summary: `<bdi>Scheherazade New</bdi> · ${ctx.m("backspaceOn")}`,
        body: `${fontChips(ctx)}${backspaceSwitch(ctx)}`,
      },
      ...(ctx.kind === "desk"
        ? [{ id: "guide" as const, title: ctx.m("gGuide"), summary: ctx.m("guideSummary"), body: guideSwitches(ctx) }]
        : []),
      { id: "recitation", title: ctx.m("gRecitation"), summary: group("recitation").summary(ctx), body: group("recitation").body(ctx) },
      { id: "progress", title: ctx.m("gProgress"), summary: ctx.m("progressSummary"), body: group("progress").body(ctx) },
    ];
    const rows = more
      .map(
        (item) =>
          `<details class="acc"${openId === item.id ? " open" : ""}><summary class="acch"><span class="tt"><b>${item.title}</b><small>${item.summary}</small></span>${chev()}</summary><div class="accb">${item.body}</div></details>`,
      )
      .join("");
    return dialog(ctx, {
      width: ctx.kind === "desk" ? 560 : undefined,
      body: `<section class="sec"><h3 class="sh">${ctx.m("essentials")}</h3><div class="stack">${top}</div></section><section class="sec"><h3 class="sh">${ctx.m("more")}</h3><div class="stack" style="gap:10px">${rows}</div></section>`,
    });
  };
}

const boardJ: Board = {
  id: "J",
  letter: "J",
  title: "Essentials and More",
  idea: "The four things almost everyone touches (language, text size with a sample, the marks to type, and on desktop the keyboard guide) sit on top. Everything else is folded under “More settings” with its current values showing.",
  frames: [
    phone("phone", "Phone: essentials on top, the rest folded.", essentials(undefined)),
    phone("phone2", "Phone: “Recitation” opened under More.", essentials("recitation"), { scrollTo: '[open]' }),
    desk("desk", "Desktop: the same, with the keyboard switch added to the essentials.", essentials(undefined)),
    arabic("ar", "Arabic.", essentials(undefined)),
  ],
  facts: [
    ["A first-time learner sees", "Four controls that matter, in plain view, and a clearly labelled “more”. Most people never go further. One screen with everything folded; 1.5 screens with Recitation opened."],
    ["Taps to reach", "An essential: 0. Lesson font: 1. Reset progress: 2."],
  ],
  worst: "Someone decides what is “essential”. Font is a favourite of Arabic learners and sits one fold deeper than it might deserve.",
};

export const BOARDS: readonly Board[] = [boardA, boardB, boardC, boardD, boardE, boardF, boardG, boardH, boardI, boardJ];

interface Custom {
  readonly id: string;
  readonly letter: string;
  readonly title: string;
  readonly idea: string;
  readonly html: string;
}

function customBoard(c: Custom): string {
  return `<article class="board" id="${c.id}"><header class="bh"><span class="badge">${c.letter}</span><div><h2>${esc(c.title)}</h2><p>${esc(c.idea)}</p></div></header>${c.html}</article>`;
}

function pair(label: string, before: string, after: string, key: string): string {
  const card = (kind: "before" | "after", html: string): string =>
    `<div class="cmp ${kind}"><h3>${kind === "before" ? "Today" : "Compact"}: ${esc(label)}</h3><div class="cmpbody" data-mh="${key}-${kind}" lang="en" dir="ltr">${html}</div><div class="cmpnum">Height <b data-mh-out="${key}-${kind}">…</b> px</div></div>`;
  return `${card("before", before)}${card("after", after)}`;
}

export function compactionBoard(): string {
  const ctx = makeCompactCtx();
  const backupCompact = `<div class="set"><div class="cache"><span class="lab">${ctx.t("backup.title")}</span><div class="btnrow"><button class="btn small" type="button">${ctx.m("downloadShort")}</button><button class="btn small" type="button">${ctx.m("restoreShort")}</button></div></div></div>`;
  const guideCompact = `<div class="set"><div class="swlist">${sw({ label: ctx.t("settings.showKeyboard"), flag: "kbd" })}</div><details><summary class="pill" style="display:inline-flex;align-items:center">${ctx.m("advanced")} ${chev()}</summary><div class="stack" style="margin-top:6px">${sw({ label: ctx.t("settings.fingerGuide") })}${sw({ label: ctx.t("settings.keyLabels") })}${sw({ label: ctx.t("settings.delayedHint"), checked: false })}</div></details></div>`;
  const html = `<div class="compare" data-frame>${pair("Vocalization", vocalRadios(ctx), vocalSeg(ctx), "voc")}${pair("Lesson font and size", `${fontRadios(ctx)}${slider(ctx)}`, lessonText(ctx), "font")}${pair("Recitation audio", `${reciterRadioBlock(ctx)}${cacheBlock(ctx)}`, `${reciterSeg(ctx)}${cacheRow(ctx)}`, "audio")}${pair("Surah order", orderRadioBlock(ctx), orderSeg(ctx), "order")}${pair("Backup and restore", backupBlock(ctx), backupCompact, "backup")}${pair("Keyboard guide (desktop)", guideSwitches(ctx), guideCompact, "guide")}</div>`;
  return customBoard({
    id: "K",
    letter: "K",
    title: "Space savers that work with any structure",
    idea: "These change how big each control is, not where it lives. Each pair is drawn at phone width with the app's real strings. Heights are measured, not estimated.",
    html,
  });
}

function makeCompactCtx(): Ctx {
  return makeCtx("en", "phone");
}

function reciterRadioBlock(ctx: Ctx): string {
  return radioList(ctx, {
    legend: ctx.t("settings.reciter"),
    value: "murattal",
    options: [
      { value: "murattal", label: ctx.t("reciter.murattal"), hint: ctx.t("reciter.murattalHint") },
      { value: "mujawwad", label: ctx.t("reciter.mujawwad"), hint: ctx.t("reciter.mujawwadHint") },
    ],
  });
}

function orderRadioBlock(ctx: Ctx): string {
  return radioList(ctx, {
    legend: ctx.t("settings.surahOrder"),
    value: "mushaf",
    options: [
      { value: "mushaf", label: ctx.t("order.mushaf"), hint: ctx.t("order.mushafHint") },
      { value: "juz", label: ctx.t("order.juzAmma"), hint: ctx.t("order.juzAmmaHint") },
    ],
  });
}

export function groupingBoard(): string {
  const col = (
    title: string,
    sub: string,
    groups: readonly (readonly [string, readonly string[], readonly string[]])[],
    cost: string,
  ): string =>
    `<div class="gcol"><h3>${esc(title)}</h3><p class="sub">${esc(sub)}</p>${groups
      .map(
        ([name, items, questions]) =>
          `<div class="gg"><b>${esc(name)}</b>${items.map((item) => `<span class="${questions.includes(item) ? "q" : ""}">${esc(item)}</span>`).join("")}</div>`,
      )
      .join("")}<p class="cost">${esc(cost)}</p></div>`;
  const byChange = col(
    "1. By what it changes",
    "Names a learner would use. Six groups, the one used in boards A to J.",
    [
      ["General", ["Language", "About"], []],
      ["Lesson text", ["Lesson font", "Lesson text size"], []],
      ["Typing", ["Vocalization", "Correct mistakes with Backspace"], ["Vocalization"]],
      ["Keyboard guide (desktop)", ["Show keyboard", "Finger guide", "Letters on keys", "Hint after a pause"], []],
      ["Recitation", ["Ayat per passage", "Surah order", "Reciter", "Saved recitations"], ["Reciter", "Saved recitations"]],
      ["Progress and data", ["Backup", "Restore", "Unlock all letters", "Reset progress"], ["Unlock all letters"]],
    ],
    "Cost: “Unlock all letters” is about Practice but lives with Backup and Reset. Reciter and audio cache are about listening, not typing, and share a group with passages.",
  );
  const byPlace = col(
    "2. By where it applies",
    "Group by the mode of the app the setting affects. Four groups.",
    [
      ["Everywhere", ["Language", "Lesson font", "Lesson text size", "Vocalization", "Correct mistakes with Backspace", "Keyboard guide (4)"], ["Vocalization"]],
      ["Recitation", ["Ayat per passage", "Surah order", "Reciter", "Saved recitations"], []],
      ["Practice", ["Unlock all letters"], ["Unlock all letters"]],
      ["Your data", ["Backup", "Restore", "Reset progress", "About"], ["About"]],
    ],
    "Cost: “Everywhere” is a bigger bucket again (9 controls), and a learner must know the app's modes before they can find anything.",
  );
  const byFrequency = col(
    "3. By how often you touch it",
    "Essentials first, then occasional, then rare and risky.",
    [
      ["Everyday", ["Language", "Lesson text size", "Vocalization", "Show keyboard"], []],
      ["Now and then", ["Lesson font", "Correct mistakes with Backspace", "Keyboard guide details", "Ayat per passage", "Surah order", "Reciter"], ["Lesson font"]],
      ["Rarely", ["Saved recitations", "Backup", "Restore", "Unlock all letters", "About"], []],
      ["Careful", ["Reset progress"], []],
    ],
    "Cost: the groups have no topic. A learner looking for “font” has to guess whether it is everyday or occasional.",
  );
  return customBoard({
    id: "L",
    letter: "L",
    title: "Three ways to group the same 18 controls",
    idea: "Gold chips mark the controls whose home is genuinely arguable. Pick the grouping first; every board above can wear any of them.",
    html: `<div class="gtable">${byChange}${byPlace}${byFrequency}</div>`,
  });
}

export function todayBoard(images: boolean): string {
  const shots = images
    ? `<div class="todayimgs">${[1, 2, 3].map((n) => `<img src="../today-phone-390x844-${n}.png" alt="Today's Settings on a phone, scroll position ${n}">`).join("")}</div>`
    : "";
  const table = `<div class="facts"><dl>
<div><dt>Phone 390 × 844</dt><dd><b>2.8 screens</b> tall. Reset progress is 1,970 px down. 13 Tab presses to reach it.</dd></div>
<div><dt>Desktop 1440 × 900</dt><dd><b>2.9 screens</b> tall (the box is only 808 px high). Reset progress is 2,182 px down. 17 Tab presses.</dd></div>
<div><dt>320 × 568, text at 200%</dt><dd><b>12.1 screens</b> tall. 6,178 px of scrolling to see everything.</dd></div>
<div><dt>Controls on screen</dt><dd>27 focusable controls in one column. 12 settings and 6 actions in 12 blocks, in the order the features were added.</dd></div>
</dl></div>`;
  return customBoard({
    id: "T",
    letter: "0",
    title: "Today, measured",
    idea: "The real dialog, measured in Chromium on the current build. These are the numbers every candidate is compared with.",
    html: `${shots}${table}`,
  });
}
