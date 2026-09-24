import { visitWith } from "../support/profile.ts";

const HARAKAT = ["َ", "ً", "ُ", "ٌ", "ِ", "ٍ", "ْ", "ّ"];

describe("diacritics on the shift layer", () => {
  it("accepts every haraka as a shifted keystroke", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full" } });
    cy.targetText().then((text) => {
      const chars = [...text];
      const firstHaraka = chars.findIndex((c) => HARAKAT.includes(c));
      expect(firstHaraka, "the passage must contain harakat").to.be.greaterThan(-1);

      cy.typeArabic(chars.slice(0, firstHaraka).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(firstHaraka));
      cy.get("[data-cy=ghost-haraka]").should("have.attr", "data-char", chars[firstHaraka]);
      cy.get("[data-cy=shift-key]").should("have.attr", "data-active", "true");

      cy.typeArabic(chars[firstHaraka] as string);
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(firstHaraka + 1));
      cy.get("[data-cy=hud-errors]").should("have.text", "0");
    });
  });

  it("types a fully diacritised passage end to end without errors", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full" } });
    cy.targetText().then((text) => {
      expect(text, "tier full must include harakat").to.match(/[ً-ْ]/);
    });
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
  });

  it("each tier exposes the expected marks", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.targetText().then((t) => expect(t).to.not.match(/[ً-ْ]/));

    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "core" } });
    cy.targetText().then((t) => {
      expect(t).to.match(/[َُِّْ]/, "core must keep the core marks");
      expect(t).to.not.match(/[ًٌٍ]/, "core must drop tanween");
    });
  });

  it("skipping a haraka is an error and the cursor holds", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full" } });
    cy.targetText().then((text) => {
      const chars = [...text];
      const i = chars.findIndex((c) => HARAKAT.includes(c));
      cy.typeArabic(chars.slice(0, i).join(""));
      cy.typeArabic(chars[i + 1] as string);
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(i));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "error");
      cy.get("[data-cy=hud-errors]").should("have.text", "1");
    });
  });
});

describe("the lam-alef key", () => {
  const LIGATURE_INDEX = 23;

  beforeEach(() => {
    visitWith({ surah: 90, settings: { mode: "recite", tierOverride: "none" } });
  });

  it("satisfies two cursor positions in a single press", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      expect(chars.slice(LIGATURE_INDEX, LIGATURE_INDEX + 2).join("")).to.equal("لا");
      cy.typeArabic(chars.slice(0, LIGATURE_INDEX).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(LIGATURE_INDEX));
      cy.typeLigature("ﻻ");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(LIGATURE_INDEX + 2));
      cy.get("[data-cy=hud-errors]").should("have.text", "0");
    });
  });

  it("is equally satisfied by two separate presses", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      cy.typeArabic(chars.slice(0, LIGATURE_INDEX).join(""));
      cy.typeArabic("لا");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(LIGATURE_INDEX + 2));
      cy.get("[data-cy=hud-errors]").should("have.text", "0");
    });
  });
});
