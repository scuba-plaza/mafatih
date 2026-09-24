import { letterOrder } from "../../src/engine/corpus/corpus.ts";
import { masteredStats, visitWith } from "../support/profile.ts";

const CDN = "https://everyayah.com/data/**/*.mp3";
const TEXT = "الحمد لله رب العالمين";

function visitCustom(customText = TEXT): void {
  visitWith({ page: "custom", settings: { customText, tierOverride: "none", showKeyboard: false } });
}

describe("custom text mode", () => {
  it("types the text you supplied and says where it came from", () => {
    visitCustom();
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "custom");
    cy.get("[data-cy=attribution]").should("contain.text", "Your own text");
    cy.targetText().should("equal", TEXT);
    cy.get("[data-cy=recitation]").should("not.exist");
    cy.get("[data-cy=ayah-mark]").should("not.exist");
  });

  it("switches mode with the page, and the header marks the page in use", () => {
    cy.intercept("GET", CDN, { fixture: "ayah.mp3,null", headers: { "content-type": "audio/mpeg" } });
    cy.visit("/?seed=7");
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "adaptive");
    cy.get("[data-cy=nav-practice]").should("have.attr", "aria-current", "page");

    cy.get("[data-cy=nav-custom]").click();
    cy.location("hash").should("equal", "#/custom");
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "custom");
    cy.get("[data-cy=nav-custom]").should("have.attr", "aria-current", "page");
    cy.get("[data-cy=nav-practice]").should("not.have.attr", "aria-current");

    cy.get("[data-cy=nav-recitation]").click();
    cy.get("[data-cy=surah-tile][data-surah=112]").click();
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "recite");
    cy.get("[data-cy=nav-recitation]").should("have.attr", "aria-current", "page");

    cy.get("[data-cy=nav-practice]").click();
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "adaptive");
    cy.get("[data-cy=nav-practice]").should("have.attr", "aria-current", "page");
  });

  it("starts a new line at every line break in the text", () => {
    visitCustom("الحمد\nلله\nرب");
    cy.get("[data-cy=line]").should("have.length", 3);
    cy.get("[data-cy=line]").eq(0).should("contain.text", "الحمد");
    cy.get("[data-cy=line]").eq(1).should("contain.text", "لله");
    cy.get("[data-cy=line]").eq(2).should("contain.text", "رب");
  });

  it("does not count towards progress, statistics or history", () => {
    visitWith({
      progress: { unlockedCount: 6, tier: "none" },
      stats: masteredStats(letterOrder.slice(0, 6)),
      page: "custom",
      settings: { customText: TEXT, tierOverride: "none", showKeyboard: false },
    });
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");

    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-cpm]").should("be.visible");
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");

    cy.showStats();
    cy.get("[data-cy=stats-sessions]").should("have.text", "0");
    cy.get("[data-cy=history-row]").should("not.exist");

    cy.reload();
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
  });

  it("rebuilds the lesson from the text typed into the editor", () => {
    visitCustom();
    cy.openCustomTextEditor();
    cy.get("[data-cy=setting-custom-text]").should("have.value", TEXT);
    cy.get("[data-cy=setting-custom-text]").clear().type("بسم الله", { delay: 0 });
    cy.closeCustomTextEditor();
    cy.targetText().should("equal", "بسم الله");

    cy.reload();
    cy.targetText().should("equal", "بسم الله");
  });

  it("reports the characters an Arabic keyboard cannot produce", () => {
    visitCustom();
    cy.openCustomTextEditor();
    cy.get("[data-cy=custom-text-report]").should("have.attr", "data-dropped", "0");
    cy.get("[data-cy=setting-custom-text]").clear().type("الحمد hello", { delay: 0 });
    cy.get("[data-cy=custom-text-report]").should("have.attr", "data-dropped", "4");
    cy.get("[data-cy=custom-text-report]").should("contain.text", "dropped");
    cy.closeCustomTextEditor();
    cy.targetText().should("equal", "الحمد");
  });

  it("keeps the punctuation an Arabic keyboard can produce, and types it", () => {
    const prose = "الحمد لله، ثم ماذا؟";
    visitCustom(prose);
    cy.targetText().should("equal", prose);
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "ok");
  });

  it("points the virtual keyboard at the key that makes the punctuation", () => {
    visitWith({ page: "custom", settings: { customText: "؟", tierOverride: "none", showKeyboard: true } });
    cy.get("[data-cy=virtual-keyboard]").should("have.attr", "data-next-code", "Slash");
    cy.get("[data-cy=shift-key]").should("have.attr", "data-active", "true");
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
  });

  it("still drops what no Arabic layout can produce", () => {
    visitCustom("الحمد lله ١٢٣");
    cy.targetText().should("equal", "الحمد له");
  });

  it("falls back to a sample rather than an empty lesson", () => {
    visitCustom("hello world");
    cy.targetText().should("not.equal", "");
    cy.get("[data-cy=typing-area]").invoke("attr", "data-total").should("not.equal", "0");
    cy.openCustomTextEditor();
    cy.get("[data-cy=custom-text-report]").should("have.attr", "data-length", "0");
    cy.get("[data-cy=custom-text-report]").should("contain.text", "Nothing typeable yet");
    cy.get("[data-cy=custom-text-sample]").click();
    cy.get("[data-cy=custom-text-report]").should("have.attr", "data-dropped", "0");
    cy.closeCustomTextEditor();
    cy.targetText().should("contain", "الحمد");
  });

  it("respects the diacritics tier", () => {
    visitWith({
      page: "custom",
      settings: { customText: "بِسْمِ اللَّهِ", tierOverride: "full", showKeyboard: false },
    });
    cy.targetText().should("equal", "بِسْمِ اللَّهِ");
    cy.openSettings();
    cy.get("[data-cy=setting-tier]").select("none");
    cy.closeSettings();
    cy.targetText().should("equal", "بسم الله");
  });

  it("keeps an edit that is closed with Escape rather than Done", () => {
    visitCustom();
    cy.openCustomTextEditor();
    cy.get("[data-cy=setting-custom-text]").clear().type("رب العالمين", { delay: 0 });
    cy.window().then((win) => {
      cy.get("[data-cy=custom-text-dialog]").then(($dialog) => {
        $dialog[0]?.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
    });
    cy.get("[data-cy=custom-text]").should("not.be.visible");
    cy.targetText().should("equal", "رب العالمين");
  });

  it("keeps the typed text out of the trainer while the editor is open", () => {
    visitCustom();
    cy.openCustomTextEditor();
    cy.get("[data-cy=setting-custom-text]").clear().type("رب", { delay: 0 });
    cy.closeCustomTextEditor();
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    cy.targetText().should("equal", "رب");
  });
});
