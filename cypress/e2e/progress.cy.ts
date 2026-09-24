import { letterOrder } from "../../src/engine/corpus/corpus.ts";
import { STORAGE_KEY } from "../../src/storage/profile.ts";
import { masteredStats, visitWith } from "../support/profile.ts";

describe("progression and persistence", () => {
  it("a fresh profile starts at six letters and tier none", () => {
    cy.visit("/?seed=7");
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
    cy.get("[data-cy=tier]").should("have.text", "none");
    cy.showStats();
    cy.get("[data-cy=letter-stat]").should("have.length", 7);
    cy.get("[data-cy=letter-stat]").last().should("have.attr", "data-char", "ﻻ");
  });

  it("unlocks the next letter once the focus letter is mastered", () => {
    const first6 = letterOrder.slice(0, 6);
    visitWith({ progress: { unlockedCount: 6, tier: "none" }, stats: masteredStats(first6) });
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=unlocked-count]").should("have.text", "7");
    cy.showStats();
    cy.get("[data-cy=letter-stat]").should("have.length.greaterThan", 6);
  });

  it("advances the tier from none to core after an accurate run", () => {
    const first8 = letterOrder.slice(0, 8);
    visitWith({ progress: { unlockedCount: 8, tier: "none" }, stats: masteredStats(first8) });
    cy.get("[data-cy=tier]").should("have.text", "none");
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=tier]").should("have.text", "core");
  });

  it("a manual tier override wins over the automatic tier", () => {
    cy.visit("/?seed=7");
    cy.get("[data-cy=tier]").should("have.text", "none");
    cy.openSettings();
    cy.get("[data-cy=setting-tier]").select("full");
    cy.closeSettings();
    cy.get("[data-cy=tier]").should("have.text", "full");
    cy.targetText().then((t) => expect(t).to.match(/[ً-ْ]/));
  });

  it("persists progress and settings across a reload", () => {
    const first6 = letterOrder.slice(0, 6);
    visitWith({ progress: { unlockedCount: 6, tier: "none" }, stats: masteredStats(first6) });
    cy.typeTarget();
    cy.get("[data-cy=unlocked-count]").should("have.text", "7");
    cy.openSettings();
    cy.get("[data-cy=setting-font]").select("amiri");
    cy.closeSettings();

    cy.reload();
    cy.get("[data-cy=unlocked-count]").should("have.text", "7");
    cy.get("[data-cy=app]").should("have.attr", "data-font", "amiri");
    cy.openSettings();
    cy.get("[data-cy=setting-font]").should("have.value", "amiri");
  });

  it("reset returns the profile to its initial state but keeps the settings", () => {
    const first6 = letterOrder.slice(0, 6);
    visitWith({
      progress: { unlockedCount: 12, tier: "core" },
      settings: { font: "amiri", fontSize: 32 },
      stats: masteredStats(first6),
    });
    cy.get("[data-cy=unlocked-count]").should("have.text", "12");
    cy.openSettings();
    cy.get("[data-cy=reset-profile]").click();
    cy.get("[data-cy=settings]").should("not.be.visible");
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
    cy.get("[data-cy=tier]").should("have.text", "none");
    cy.get("[data-cy=app]").should("have.attr", "data-font", "amiri");
    cy.window().then((win) => {
      const raw = win.localStorage.getItem(STORAGE_KEY);
      expect(raw).to.be.a("string");
      const stored = JSON.parse(raw as string);
      expect(stored.progress.unlockedCount).to.equal(6);
      expect(stored.settings.font).to.equal("amiri");
      expect(stored.settings.fontSize).to.equal(32);
    });
  });

  it("records per-letter latency once a lesson is finished", () => {
    cy.visit("/?seed=7");
    cy.typeTarget({ delay: 10 });
    cy.get("[data-cy=completion]").should("be.visible");
    cy.showStats();
    cy.get("[data-cy=letter-stat][data-attempts='0']").should("have.length.lessThan", 6);
  });
});

describe("earning letters by typing", () => {
  const TYPING = { delay: 25 } as const;
  const first5 = letterOrder.slice(0, 5);
  const sixth = letterOrder[5] as string;
  const seventh = letterOrder[6] as string;

  it("a fresh profile types its way from six letters to eight, surviving a reload", () => {
    cy.visit("/?seed=7");
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
    cy.get("[data-cy=focus-letter]").should("have.attr", "data-char", sixth);

    cy.completeLessonsUntilUnlocked(7, { ...TYPING, maxLessons: 4 });
    cy.get("[data-cy=focus-letter]").should("have.attr", "data-char", seventh);
    cy.targetText().should("contain", seventh);

    cy.reload();
    cy.get("[data-cy=unlocked-count]").should("have.text", "7");
    cy.get("[data-cy=focus-letter]").should("have.attr", "data-char", seventh);

    cy.completeLessonsUntilUnlocked(8, { ...TYPING, maxLessons: 4 });
    cy.get("[data-cy=tier]").should("not.have.text", "none");
    cy.showStats();
    cy.get("[data-cy=letter-stat]").should("have.length.at.least", 8);
  });

  it("keeps climbing for a learner who slips on one letter in fifteen", () => {
    cy.visit("/?seed=7");
    cy.completeLessonsUntilUnlocked(8, { ...TYPING, mistakeEvery: 15, maxLessons: 12 });
  });

  it("lets a letter dragged down by early mistakes recover once the typing is clean", () => {
    visitWith({
      progress: { unlockedCount: 6, tier: "none" },
      stats: {
        ...masteredStats(first5),
        [sixth]: { char: sixth, samples: 180, meanMs: 300, hits: 180, misses: 20 },
      },
    });
    cy.get("[data-cy=focus-letter]").should("have.attr", "data-char", sixth).and("have.attr", "data-accuracy", "0.900");
    cy.completeLessonsUntilUnlocked(7, { ...TYPING, maxLessons: 5 });
    cy.get("[data-cy=focus-letter]").should("have.attr", "data-char", seventh);
  });
});

describe("the stats page", () => {
  it("lives on its own route, reachable and leavable from the header", () => {
    cy.visit("/?seed=7");
    cy.get("[data-cy=app]").should("have.attr", "data-route", "practice");
    cy.get("[data-cy=stats]").should("not.exist");

    cy.showStats();
    cy.get("[data-cy=app]").should("have.attr", "data-route", "stats");
    cy.location("hash").should("equal", "#/stats");
    cy.get("[data-cy=typing-area]").should("not.exist");

    cy.showPractice();
    cy.get("[data-cy=app]").should("have.attr", "data-route", "practice");
    cy.get("[data-cy=stats]").should("not.exist");
  });

  it("survives a reload on the stats route", () => {
    cy.visit("/?seed=7");
    cy.showStats();
    cy.reload();
    cy.get("[data-cy=stats]").should("be.visible");
    cy.get("[data-cy=stats-letters]").should("have.text", `6/${letterOrder.length}`);
  });

  it("does not score keystrokes while the stats page is open", () => {
    cy.visit("/?seed=7");
    cy.targetText().then((text) => {
      const chars = [...text];
      cy.showStats();
      cy.typeArabic(chars.slice(0, 3).join(""));
      cy.showPractice();
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    });
  });

  it("summarises a finished lesson in the tiles and the history table", () => {
    cy.visit("/?seed=7");
    cy.typeTarget({ delay: 5 });
    cy.get("[data-cy=completion]").should("be.visible");
    cy.showStats();
    cy.get("[data-cy=stats-sessions]").should("have.text", "1");
    cy.get("[data-cy=stats-tier]").should("have.text", "none");
    cy.get("[data-cy=stats-accuracy]").should("have.text", "100%");
    cy.get("[data-cy=history-row]").should("have.length", 1);
  });

  it("shows no history before the first lesson is finished", () => {
    cy.visit("/?seed=7");
    cy.showStats();
    cy.get("[data-cy=stats-sessions]").should("have.text", "0");
    cy.get("[data-cy=history-row]").should("not.exist");
  });
});
