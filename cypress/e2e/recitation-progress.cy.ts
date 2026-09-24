import { generateRecitePassage } from "../../src/engine/lessons/recite.ts";
import type { SurahRecord } from "../../src/engine/recitation/recitation.ts";
import { STORAGE_KEY } from "../../src/storage/profile.ts";
import { masteredStats, visitWith } from "../support/profile.ts";

const RECITE = { mode: "recite", tierOverride: "none", ayatPerLesson: 4, autoAdvance: false } as const;

function partial(resume: number, typedTo: number): SurahRecord {
  return {
    run: { typed: [[1, typedTo]], chars: 400, keystrokes: 410, errors: 10, elapsedMs: 120_000 },
    resume,
    completions: 0,
    bestAccuracy: 0,
    bestCpm: 0,
    completedAt: null,
  };
}

function completed(bestAccuracy: number): SurahRecord {
  return {
    run: { typed: [], chars: 0, keystrokes: 0, errors: 0, elapsedMs: 0 },
    resume: 1,
    completions: 1,
    bestAccuracy,
    bestCpm: 150,
    completedAt: 1,
  };
}

function passage(surah: number, range: string): void {
  cy.get("[data-cy=attribution]").should("have.attr", "data-surah", String(surah));
  cy.get("[data-cy=attribution]").should("contain.text", `${surah}:${range}`);
}

describe("recitation mode progression", () => {
  it("moves on to the next ayat after a passage and remembers them across a reload", () => {
    visitWith({ surah: 2, settings: RECITE });
    passage(2, "1–4");
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-covered", "0");

    cy.completeLesson();
    passage(2, "5–8");
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-from", "5").and("have.attr", "data-covered", "4");
    cy.get("[data-cy=passage-typed]").should("have.length", 1);

    cy.reload();
    passage(2, "5–8");
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-covered", "4");
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.recitation.position).to.deep.equal({ surah: 2, ayah: 5 });
    });
  });

  it("keeps counting recited letters toward the letter statistics", () => {
    visitWith({ surah: 2, settings: RECITE });
    cy.completeLesson();
    cy.showStats();
    cy.get("[data-cy=stats-sessions]").should("have.text", "1");
  });

  it("shows no recitation bar outside recitation", () => {
    cy.visit("/?seed=3");
    cy.get("[data-cy=typing-area]").should("exist");
    cy.get("[data-cy=passage-bar]").should("not.exist");
  });
});

describe("navigating ayat", () => {
  it("starts at a chosen ayah from the recitation settings", () => {
    visitWith({ surah: 2, settings: RECITE });
    cy.openRecitationSettings();
    cy.get("[data-cy=setting-ayah]").should("have.value", "1").select("2:100");
    cy.get("[data-cy=setting-ayah]").should("have.value", "100");
    cy.closeRecitationSettings();
    passage(2, "100–103");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
  });

  it("offers every ayah of the selected surah and resumes a surah where it was left", () => {
    visitWith({ surah: 112, settings: RECITE, recitation: { surahs: { 36: partial(21, 20) } } });
    cy.openRecitationSettings();
    cy.get("[data-cy=setting-ayah] option").should("have.length", 4);
    cy.get("[data-cy=setting-surah]").select("36");
    cy.get("[data-cy=setting-ayah]").should("have.value", "21");
    cy.get("[data-cy=setting-ayah] option").should("have.length", 83);
    cy.closeRecitationSettings();
    passage(36, "21–24");
  });

  it("steps between passages with the buttons and with Page Up / Page Down", () => {
    visitWith({ surah: 2, ayah: 100, settings: RECITE });
    passage(2, "100–103");
    cy.get("[data-cy=passage-next]").click();
    passage(2, "104–107");
    cy.get("[data-cy=passage-previous]").click();
    passage(2, "100–103");
    cy.typeRawKey("PageDown");
    passage(2, "104–107");
    cy.typeRawKey("PageUp");
    passage(2, "100–103");
  });

  it("keeps typing after a navigation button was clicked", () => {
    visitWith({ surah: 2, ayah: 100, settings: RECITE });
    cy.get("[data-cy=passage-next]").click();
    passage(2, "104–107");
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 3).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "3");
    });
  });

  it("crosses into the neighbouring surah at either end", () => {
    visitWith({ surah: 2, ayah: 1, settings: RECITE });
    cy.get("[data-cy=passage-previous]").click();
    passage(1, "4–7");
    cy.get("[data-cy=passage-next]").click();
    passage(2, "1–4");
    visitWith({ surah: 2, ayah: 285, settings: RECITE });
    passage(2, "285–286");
    cy.get("[data-cy=passage-next]").click();
    passage(3, "1–4");
  });

  it("jumps along the surah by clicking its progress bar", () => {
    visitWith({ surah: 2, settings: RECITE });
    cy.get("[data-cy=passage-progress]").click("right");
    passage(2, "286");
    cy.get("[data-cy=passage-progress]").click("center");
    passage(2, "143–146");
    cy.get("[data-cy=passage-progress]").click("left");
    passage(2, "1–4");
  });

  it("does not move the passage outside recitation", () => {
    cy.visit("/?seed=3");
    cy.targetText().then((first) => {
      cy.typeRawKey("PageDown");
      cy.targetText().should("equal", first);
    });
  });
});

describe("completing a surah", () => {
  it("celebrates the surah, pauses typing, and continues with the next one", () => {
    visitWith({ surah: 112, settings: RECITE });
    cy.typeTarget();
    cy.get("[data-cy=surah-complete]")
      .should("be.visible")
      .and("have.attr", "data-surah", "112")
      .and("have.attr", "data-next", "113")
      .and("have.attr", "data-completions", "1");
    cy.get("[data-cy=surah-complete]").should("contain.text", "Al-Ikhlaas complete");
    cy.get("[data-cy=surah-complete-ayat]").should("have.text", "4");
    cy.get("[data-cy=surah-complete-accuracy]").should("have.text", "100%");
    cy.get("[data-cy=surah-complete-star]").should("exist");
    cy.get("[data-cy=surah-complete-count]").should("have.text", "1 of 114 surahs complete");
    cy.get("[data-cy=surah-complete-next]").should("have.focus").and("contain.text", "Al-Falaq");

    passage(113, "1–4");
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 2).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    });

    cy.get("[data-cy=surah-complete-next]").click();
    cy.get("[data-cy=surah-complete]").should("not.exist");
    passage(113, "1–4");
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 2).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "2");
    });
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-surah", "113");
  });

  it("gathers every passage of the surah into the celebration", () => {
    visitWith({ surah: 112, settings: { ...RECITE, ayatPerLesson: 2 } });
    cy.completeLesson();
    passage(112, "3–4");
    cy.get("[data-cy=surah-complete]").should("not.exist");
    cy.typeTarget();
    cy.get("[data-cy=surah-complete-ayat]").should("have.text", "4");
  });

  it("closes the celebration with Escape", () => {
    visitWith({ surah: 112, settings: RECITE });
    cy.typeTarget();
    cy.get("[data-cy=surah-complete]").should("be.visible");
    cy.get("[data-cy=surah-complete-next]").trigger("keydown", { key: "Escape" });
    cy.get("[data-cy=surah-complete]").should("not.exist");
    passage(113, "1–4");
  });

  it("types the surah again on request", () => {
    visitWith({ surah: 112, settings: RECITE });
    cy.typeTarget();
    cy.get("[data-cy=surah-complete-replay]").click();
    cy.get("[data-cy=surah-complete]").should("not.exist");
    passage(112, "1–4");
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-complete", "true");
    cy.typeTarget();
    cy.get("[data-cy=surah-complete]").should("have.attr", "data-completions", "2");
    cy.get("[data-cy=surah-complete-note]").should("contain.text", "2nd time");
  });

  it("withholds the star from a surah typed below 95% accuracy", () => {
    visitWith({ surah: 112, settings: RECITE });
    cy.typeTarget({ mistakeEvery: 4 });
    cy.get("[data-cy=surah-complete]").should("have.attr", "data-starred", "false");
    cy.get("[data-cy=surah-complete-star]").should("not.exist");
    cy.get("[data-cy=surah-complete-next]").click();
    cy.get("[data-cy=nav-recitation]").click();
    cy.get("[data-cy=surah-tile][data-surah=112]")
      .should("have.attr", "data-complete", "true")
      .and("have.attr", "data-starred", "false");
  });

  it("follows the Juz 'Amma order when it is chosen", () => {
    visitWith({ surah: 112, settings: { ...RECITE, surahOrder: "juz-amma" } });
    cy.typeTarget();
    cy.get("[data-cy=surah-complete]").should("have.attr", "data-next", "111");
    cy.get("[data-cy=surah-complete-next]").click();
    passage(111, "1–4");
  });
});

describe("the surah map", () => {
  it("lives on its own route and lists every surah in mushaf order", () => {
    cy.visit("/?seed=3");
    cy.get("[data-cy=nav-recitation]").click();
    cy.location("hash").should("equal", "#/recitation");
    cy.get("[data-cy=app]").should("have.attr", "data-route", "recitation");
    cy.get("[data-cy=typing-area]").should("not.exist");
    cy.get("[data-cy=surah-tile]").should("have.length", 114);
    cy.get("[data-cy=surah-tile]").first().should("have.attr", "data-surah", "1");
    cy.get("[data-cy=surah-tile]").last().should("have.attr", "data-surah", "114");
    cy.get("[data-cy=recitation-surahs]").should("have.text", "0/114");
  });

  it("shows completed, starred and partly typed surahs", () => {
    visitWith(
      {
        surah: 36,
        ayah: 21,
        settings: RECITE,
        recitation: { surahs: { 36: partial(21, 20), 112: completed(0.99), 113: completed(0.9) } },
      },
      "?seed=3#/recitation",
    );
    cy.get("[data-cy=recitation-surahs]").should("have.text", "2/114");
    cy.get("[data-cy=surah-tile][data-surah=112]")
      .should("have.attr", "data-complete", "true")
      .and("have.attr", "data-starred", "true");
    cy.get("[data-cy=surah-tile][data-surah=113]")
      .should("have.attr", "data-complete", "true")
      .and("have.attr", "data-starred", "false");
    cy.get("[data-cy=surah-tile][data-surah=36]")
      .should("have.attr", "data-complete", "false")
      .and("have.attr", "data-covered", "20")
      .and("have.attr", "data-current", "true");
    cy.get("[data-cy=recitation-continue]").should("contain.text", "Yaseen 36:21");
  });

  it("continues a surah from its tile where it was left, switching into recitation", () => {
    visitWith({ recitation: { surahs: { 36: partial(21, 20) } } }, "?seed=3#/recitation");
    cy.get("[data-cy=surah-tile][data-surah=36]").click();
    cy.location("hash").should("equal", "#/");
    passage(36, "21–24");
    cy.get("[data-cy=nav-recitation]").click();
    cy.get("[data-cy=surah-tile][data-surah=2]").click();
    passage(2, "1–4");
  });

  it("reorders the map to put Juz 'Amma first", () => {
    visitWith({}, "?seed=3#/recitation");
    cy.get("[data-cy=recitation-order]").select("juz-amma");
    cy.get("[data-cy=surah-tile]").first().should("have.attr", "data-surah", "114");
    cy.get("[data-cy=surah-tile]").eq(36).should("have.attr", "data-surah", "78");
    cy.get("[data-cy=surah-tile]").eq(37).should("have.attr", "data-surah", "1");
    cy.openRecitationSettings();
    cy.get("[data-cy=setting-surah-order]").should("have.value", "juz-amma");
  });

  it("resets the recitation without touching the unlocked letters", () => {
    visitWith(
      {
        progress: { unlockedCount: 12, tier: "core" },
        stats: masteredStats(["ا"]),
        surah: 36,
        ayah: 21,
        recitation: { surahs: { 36: partial(21, 20), 112: completed(0.99) } },
      },
      "?seed=3#/recitation",
    );
    cy.get("[data-cy=recitation-surahs]").should("have.text", "1/114");
    cy.get("[data-cy=reset-recitation]").click();
    cy.get("[data-cy=recitation-surahs]").should("have.text", "0/114");
    cy.get("[data-cy=surah-tile][data-surah=36]").should("have.attr", "data-covered", "0");
    cy.get("[data-cy=surah-tile][data-surah=1]").should("have.attr", "data-current", "true");
    cy.get("[data-cy=unlocked-count]").should("have.text", "12");
  });

  it("keeps the recitation when the letter progress is reset", () => {
    visitWith({ surah: 36, ayah: 21, settings: RECITE, recitation: { surahs: { 112: completed(0.99) } } });
    cy.openSettings();
    cy.get("[data-cy=reset-profile]").click();
    passage(36, "21–24");
    cy.get("[data-cy=nav-recitation]").click();
    cy.get("[data-cy=recitation-surahs]").should("have.text", "1/114");
  });
});

function ayahStart(surah: number, fromAyah: number, ayah: number): number {
  const lesson = generateRecitePassage({ surah, fromAyah, tier: "none", maxAyat: 4 });
  const span = lesson.ayat.find((candidate) => candidate.ayah === ayah);
  if (span === undefined) {
    throw new Error(`ayah ${ayah} is not in ${surah}:${fromAyah}`);
  }
  return span.start;
}

function typeUpTo(cursor: number): void {
  cy.targetText().then((text) => {
    cy.typeArabic([...text].slice(0, cursor).join(""));
  });
  cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(cursor));
}

function stubAudio(): void {
  cy.intercept("GET", "https://everyayah.com/data/**/*.mp3", {
    fixture: "ayah.mp3,null",
    headers: { "content-type": "audio/mpeg" },
  });
}

describe("resuming a level", () => {
  beforeEach(stubAudio);

  it("picks the level up after the last finished ayah when the page is reloaded", () => {
    visitWith({ surah: 2, settings: RECITE });
    const fourth = ayahStart(2, 1, 4);
    typeUpTo(fourth);
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-covered", "3");

    cy.reload();
    passage(2, "1–4");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(fourth));
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-covered", "3");
    cy.get("[data-cy=passage-done]").should("not.exist");
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "4");
    cy.get("[data-cy=hud-cpm]").should("have.text", "0");

    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(fourth).join(""));
    });
    passage(2, "5–8");
    cy.get("[data-cy=passage-bar]").should("have.attr", "data-covered", "4");
  });

  it("keeps every finished ayah but not the half-typed one", () => {
    visitWith({ surah: 2, settings: RECITE });
    const second = ayahStart(2, 1, 2);
    typeUpTo(second + 3);
    cy.reload();
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(second));
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "2");
  });

  it("saves the letter statistics of finished ayat before the level is over", () => {
    visitWith({ surah: 2, settings: RECITE });
    typeUpTo(ayahStart(2, 1, 3));
    cy.reload();
    cy.showStats();
    cy.get("[data-cy=letter-stat][data-attempts!='0']").should("have.length.greaterThan", 0);
  });
});

describe("finished levels", () => {
  beforeEach(stubAudio);

  it("shows a finished passage as done, and only types it again when asked", () => {
    visitWith({ surah: 2, settings: RECITE });
    cy.completeLesson();
    passage(2, "5–8");
    cy.get("[data-cy=passage-done]").should("not.exist");

    cy.get("[data-cy=passage-previous]").click();
    passage(2, "1–4");
    cy.get("[data-cy=passage-done]").should("be.visible").and("contain.text", "Already typed");
    cy.get("[data-cy=typing-area]")
      .invoke("attr", "data-total")
      .then((total) => {
        cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(total));
      });
    cy.get("[data-cy=virtual-keyboard]").should("have.attr", "data-next-code", "");
    cy.typeArabic("ا");
    cy.get("[data-cy=hud-errors]").should("have.text", "0");

    cy.reload();
    cy.get("[data-cy=passage-done]").should("be.visible");

    cy.get("[data-cy=passage-redo]").click();
    cy.get("[data-cy=passage-done]").should("not.exist");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 2).join(""));
    });
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "2");
  });

  it("moves on from a finished passage with its next button", () => {
    visitWith({ surah: 2, settings: RECITE, recitation: { surahs: { 2: partial(5, 4) } } });
    passage(2, "1–4");
    cy.get("[data-cy=passage-done]").should("be.visible");
    cy.get("[data-cy=passage-done-next]").click();
    passage(2, "5–8");
    cy.get("[data-cy=passage-done]").should("not.exist");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
  });

  it("treats every passage of a completed surah as done", () => {
    visitWith({ surah: 112, settings: RECITE, recitation: { surahs: { 112: completed(0.99) } } });
    cy.get("[data-cy=passage-done]").should("be.visible");
    cy.get("[data-cy=passage-done-note]").should("contain.text", "surah is complete");
  });

  it("opens a completed surah from the map as done", () => {
    visitWith({ recitation: { surahs: { 112: completed(0.99) } } }, "?seed=3#/recitation");
    cy.get("[data-cy=surah-tile][data-surah=112]").click();
    passage(112, "1–4");
    cy.get("[data-cy=passage-done]").should("be.visible");
  });
});
