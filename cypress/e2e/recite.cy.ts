import { visitWith } from "../support/profile.ts";

describe("recite mode", () => {
  it("shows surah attribution with an ayah range", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "recite");
    cy.get("[data-cy=attribution]").should("have.attr", "data-surah", "112");
    cy.get("[data-cy=attribution]").should("contain.text", "Al-Ikhlaas");
  });

  it("switches from practice to recite through the settings", () => {
    cy.visit("/?seed=11");
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "adaptive");
    cy.openSettings();
    cy.get("[data-cy=setting-mode]").select("recite");
    cy.get("[data-cy=open-recitation-settings]").click();
    cy.get("[data-cy=setting-surah]").should("be.visible");
    cy.closeRecitationSettings();
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "recite");
  });

  it("changing surah changes the passage", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.targetText().then((first) => {
      cy.openRecitationSettings();
      cy.get("[data-cy=setting-surah]").select("108. Al-Kawthar");
      cy.closeRecitationSettings();
      cy.get("[data-cy=attribution]").should("have.attr", "data-surah", "108");
      cy.targetText().should("not.equal", first);
    });
  });

  it("wraps a long passage onto multiple lines, breaking only at spaces", () => {
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=line]").should("have.length.greaterThan", 1);
    cy.get("[data-cy=line-untyped]").each(($span) => {
      const text = $span.text();
      expect(text.startsWith(" "), "a line must not start with a space").to.equal(false);
    });
  });

  it("types a whole passage and reports completion", () => {
    visitWith({ surah: 108, settings: { mode: "recite", tierOverride: "none" } });
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
  });
});
