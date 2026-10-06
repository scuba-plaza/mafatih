import { STORAGE_KEY } from "../../src/storage/profile.ts";
import { visitWith } from "../support/profile.ts";

function hashOfLink(value: string): string {
  return value.slice(value.indexOf("#"));
}

describe("the export & import modal", () => {
  it("opens from settings and goes back without losing the dialog", () => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]").should("exist");
    cy.openTransferSettings();
    cy.get("[data-cy=settings]").should("not.be.visible");
    cy.get("[data-cy=transfer-back]").click();
    cy.get("[data-cy=settings]").should("be.visible");
    cy.get("[data-cy=transfer]").should("not.be.visible");
  });

  it("creates a transfer link for the current progress", () => {
    visitWith({ progress: { unlockedCount: 10, tier: "none" }, settings: { font: "amiri" } });
    cy.openTransferSettings();
    cy.get("[data-cy=export-link]").click();
    cy.get("[data-cy=transfer-link]")
      .invoke("val")
      .should("match", /#\/import\/[A-Za-z0-9_-]+$/);
  });

  it("offers a file download without touching what is stored", () => {
    visitWith({ progress: { unlockedCount: 6, tier: "none" } });
    cy.openTransferSettings();
    cy.get("[data-cy=export-file]").click();
    cy.get("[data-cy=transfer]").should("be.visible");
    cy.window().then((win) => {
      const raw = win.localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).progress.unlockedCount).to.equal(6);
    });
  });

  it("loads an exported link into a different profile once the overwrite is confirmed", () => {
    visitWith({ progress: { unlockedCount: 12, tier: "none" }, settings: { font: "amiri" } });
    cy.openTransferSettings();
    cy.get("[data-cy=export-link]").click();
    cy.get("[data-cy=transfer-link]")
      .invoke("val")
      .then((value) => {
        const hash = hashOfLink(String(value));
        visitWith(
          { progress: { unlockedCount: 6, tier: "none" }, settings: { font: "scheherazade" } },
          `?seed=1${hash}`,
        );
      });
    cy.get("[data-cy=unlocked-count]").should("have.text", "12");
    cy.get("[data-cy=app]").should("have.attr", "data-font", "amiri");
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.progress.unlockedCount).to.equal(12);
      expect(stored.settings.font).to.equal("amiri");
    });
  });

  it("leaves the stored profile untouched when the overwrite is declined", () => {
    visitWith({ progress: { unlockedCount: 12, tier: "none" } });
    cy.openTransferSettings();
    cy.get("[data-cy=export-link]").click();
    cy.get("[data-cy=transfer-link]")
      .invoke("val")
      .then((value) => {
        const hash = hashOfLink(String(value));
        cy.on("window:confirm", () => false);
        visitWith({ progress: { unlockedCount: 6, tier: "none" } }, `?seed=2${hash}`);
      });
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.progress.unlockedCount).to.equal(6);
    });
  });

  it("alerts and leaves storage untouched for a corrupted transfer link", () => {
    cy.on("window:alert", () => {});
    visitWith({ progress: { unlockedCount: 6, tier: "none" } }, "?seed=3#/import/not-valid-base64!!");
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
  });

  it("imports a progress file once the overwrite is confirmed", () => {
    visitWith({ progress: { unlockedCount: 6, tier: "none" } });
    const exported = {
      progress: { unlockedCount: 20, tier: "core" },
      stats: {},
      settings: { font: "scheherazade" },
      history: [],
      recitation: { position: { surah: 1, ayah: 1 }, surahs: {} },
    };
    cy.openTransferSettings();
    cy.get("[data-cy=import-file-input]").selectFile(
      {
        contents: Cypress.Buffer.from(JSON.stringify(exported)),
        fileName: "mafatih-progress.json",
        mimeType: "application/json",
      },
      { force: true },
    );
    cy.get("[data-cy=unlocked-count]").should("have.text", "20");
    cy.get("[data-cy=app]").should("have.attr", "data-font", "scheherazade");
  });

  it("rejects a file that is not a progress export, without prompting to overwrite", () => {
    visitWith({ progress: { unlockedCount: 6, tier: "none" } });
    cy.openTransferSettings();
    cy.get("[data-cy=import-file-input]").selectFile(
      { contents: Cypress.Buffer.from("not json"), fileName: "bad.json", mimeType: "application/json" },
      { force: true },
    );
    cy.get("[data-cy=import-error]").should("be.visible");
    cy.get("[data-cy=unlocked-count]").should("have.text", "6");
  });
});
