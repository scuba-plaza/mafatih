import { DEFAULT_FONT_SIZE } from "../../src/engine/fonts.ts";
import { STORAGE_KEY } from "../../src/storage/profile.ts";
import { visitWith } from "../support/profile.ts";

describe("the settings dialog", () => {
  beforeEach(() => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("stays out of the way until it is asked for", () => {
    cy.get("[data-cy=settings]").should("not.be.visible");
    cy.openSettings();
    cy.closeSettings();
  });

  it("closes on Escape", () => {
    cy.openSettings();
    cy.window().then((win) => {
      cy.get("[data-cy=settings-dialog]").then(($dialog) => {
        $dialog[0]?.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
    });
    cy.get("[data-cy=settings]").should("not.be.visible");
  });

  it("closes when the backdrop is clicked", () => {
    cy.openSettings();
    cy.window().then((win) => {
      cy.get("[data-cy=settings-dialog]").then(($dialog) => {
        $dialog[0]?.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
      });
    });
    cy.get("[data-cy=settings]").should("not.be.visible");
  });

  it("does not score keystrokes typed while it is open", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      cy.openSettings();
      cy.typeArabic(chars.slice(0, 3).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
      cy.closeSettings();
      cy.typeArabic(chars.slice(0, 3).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "3");
    });
  });
});

function travelled(caret: HTMLElement): number {
  const line = caret.closest("[data-cy=line]") as HTMLElement;
  const text = line.querySelector("[data-cy=line-untyped]") as HTMLElement;
  return text.getBoundingClientRect().right - caret.getBoundingClientRect().left;
}

describe("font size", () => {
  it("defaults to 48 px and drives the lesson text", () => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-font-size", String(DEFAULT_FONT_SIZE));
    cy.get("[data-cy=typing-area]").should("have.css", "font-size", `${DEFAULT_FONT_SIZE}px`);
    cy.openSettings();
    cy.get("[data-cy=setting-font-size]").should("have.value", String(DEFAULT_FONT_SIZE));
  });

  it("resizes the lesson text and remembers the choice", () => {
    cy.visit("/?seed=5");
    cy.openSettings();
    cy.get("[data-cy=setting-font-size]").select("32");
    cy.closeSettings();
    cy.get("[data-cy=typing-area]").should("have.css", "font-size", "32px");

    cy.reload();
    cy.get("[data-cy=typing-area]").should("have.css", "font-size", "32px");
    cy.window().then((win) => {
      const raw = win.localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).settings.fontSize).to.equal(32);
    });
  });

  it("wraps the same passage onto more lines as the text grows", () => {
    visitWith({ settings: { mode: "recite", surah: 2, tierOverride: "none", fontSize: 28 } });
    cy.get("[data-cy=line]").then(($small) => {
      const small = $small.length;
      cy.openSettings();
      cy.get("[data-cy=setting-font-size]").select("72");
      cy.closeSettings();
      cy.get("[data-cy=line]").should("have.length.greaterThan", small);
    });
  });

  it("keeps the lesson and re-measures the caret across a resize", () => {
    visitWith({ settings: { mode: "recite", surah: 112, tierOverride: "none", fontSize: 32 } });
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 4).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "4");
      cy.get("[data-cy=caret]").then(($caret) => {
        const before = travelled($caret[0] as HTMLElement);
        cy.openSettings();
        cy.get("[data-cy=setting-font-size]").select("64");
        cy.closeSettings();
        cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "4");
        cy.targetText().should("equal", text);
        cy.get("[data-cy=caret]").should(($resized) => {
          expect(
            travelled($resized[0] as HTMLElement),
            "the caret is re-measured against the bigger text",
          ).to.be.greaterThan(before);
        });
      });
    });
  });
});

describe("the recitation modal", () => {
  beforeEach(() => {
    visitWith({ settings: { mode: "recite", surah: 112, tierOverride: "none" } });
  });

  it("keeps the recitation controls out of the basic settings", () => {
    cy.openSettings();
    for (const control of ["setting-surah", "setting-ayat", "setting-reciter", "setting-auto-advance"]) {
      cy.get(`[data-cy=${control}]`).should("not.be.visible");
    }
    cy.get("[data-cy=open-recitation-settings]").should("be.visible");
  });

  it("opens from settings and hands focus over one modal at a time", () => {
    cy.openRecitationSettings();
    cy.get("[data-cy=settings]").should("not.be.visible");
    cy.get("[data-cy=setting-surah]").should("be.visible");
    cy.get("[data-cy=setting-ayat]").should("be.visible");
    cy.get("[data-cy=setting-reciter]").should("be.visible");
  });

  it("goes back to settings without losing the dialog", () => {
    cy.openRecitationSettings();
    cy.get("[data-cy=recitation-settings-back]").click();
    cy.get("[data-cy=settings]").should("be.visible");
    cy.get("[data-cy=recitation-settings]").should("not.be.visible");
  });

  it("closes on Escape and swallows keystrokes while open", () => {
    cy.openRecitationSettings();
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 2).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    });
    cy.window().then((win) => {
      cy.get("[data-cy=recitation-settings-dialog]").then(($dialog) => {
        $dialog[0]?.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
    });
    cy.get("[data-cy=recitation-settings]").should("not.be.visible");
    cy.get("[data-cy=settings]").should("not.be.visible");
  });
});
