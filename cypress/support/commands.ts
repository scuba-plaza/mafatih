import { letterIndex } from "../../src/engine/corpus/corpus.ts";
import { DEFAULT_LAYOUT, type KeyStroke, type LayoutId, strokeFor } from "../../src/engine/layout/ara.ts";
import { LIGATURES } from "../../src/engine/layout/ligatures.ts";

export interface ArabicTypeOptions {
  delay?: number;
  layout?: LayoutId;
  mistakeEvery?: number;
}

export interface LessonLoopOptions extends ArabicTypeOptions {
  maxLessons?: number;
}

const MISTAKE = "ز";
const MISTAKE_FALLBACK = "ظ";
const DEFAULT_MAX_LESSONS = 10;

function dispatch(win: Cypress.AUTWindow, type: "keydown" | "keyup", key: string, code: string, shift: boolean): void {
  const event = new win.KeyboardEvent(type, {
    key,
    code,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  win.dispatchEvent(event);
}

function press(win: Cypress.AUTWindow, key: string, stroke: KeyStroke): void {
  if (stroke.shift) {
    dispatch(win, "keydown", "Shift", "ShiftLeft", true);
  }
  dispatch(win, "keydown", key, stroke.code, stroke.shift);
  dispatch(win, "keyup", key, stroke.code, stroke.shift);
  if (stroke.shift) {
    dispatch(win, "keyup", "Shift", "ShiftLeft", false);
  }
}

function pressChar(win: Cypress.AUTWindow, char: string, layout: LayoutId): void {
  const stroke = strokeFor(char, layout);
  if (stroke === undefined) {
    throw new Error(`no keystroke on the ${layout} layout produces ${JSON.stringify(char)}`);
  }
  press(win, char, stroke);
}

function withMistakes(text: string, every: number): string[] {
  const strokes: string[] = [];
  let letters = 0;
  for (const char of [...text]) {
    if (every > 0 && letterIndex.has(char)) {
      letters += 1;
      if (letters % every === 0) {
        strokes.push(char === MISTAKE ? MISTAKE_FALLBACK : MISTAKE);
      }
    }
    strokes.push(char);
  }
  return strokes;
}

Cypress.Commands.add("typeArabic", (text: string, options: ArabicTypeOptions = {}) => {
  const delay = options.delay ?? 0;
  const layout = options.layout ?? DEFAULT_LAYOUT;
  const strokes = withMistakes(text, options.mistakeEvery ?? 0);
  if (delay > 0) {
    for (const char of strokes) {
      cy.window({ log: false }).then((win) => pressChar(win, char, layout));
      cy.wait(delay, { log: false });
    }
  } else {
    cy.window({ log: false }).then((win) => {
      for (const char of strokes) {
        pressChar(win, char, layout);
      }
    });
  }
  cy.log(`typeArabic: ${text}`);
});

Cypress.Commands.add("typeLigature", (ligature: string) => {
  if (!LIGATURES.has(ligature)) {
    throw new Error(`${JSON.stringify(ligature)} is not a lam-alef ligature`);
  }
  cy.window({ log: false }).then((win) => {
    const stroke = strokeFor(ligature, "pc102");
    if (stroke === undefined) {
      throw new Error(`no keystroke produces ${JSON.stringify(ligature)}`);
    }
    press(win, ligature, stroke);
  });
});

Cypress.Commands.add("typeRawKey", (key: string, code = "Unidentified", shift = false) => {
  cy.window({ log: false }).then((win) => {
    dispatch(win, "keydown", key, code, shift);
    dispatch(win, "keyup", key, code, shift);
  });
});

Cypress.Commands.add("targetText", () => {
  return cy.get("[data-cy=typing-area]").then(($el) => {
    const segments = $el.find("[data-seg-start]").toArray();
    return segments.map((s) => s.textContent ?? "").join("");
  });
});

Cypress.Commands.add("typeTarget", (options: ArabicTypeOptions = {}) => {
  cy.targetText().then((text) => {
    cy.typeArabic(text, options);
  });
});

Cypress.Commands.add("completeLesson", (options: ArabicTypeOptions = {}) => {
  cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
  cy.typeTarget(options);
  cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
});

function lessonsUntil(
  selector: string,
  reached: (text: string) => boolean,
  options: LessonLoopOptions,
  typed: number,
): Cypress.Chainable<number> {
  return cy
    .get(selector, { log: false })
    .invoke({ log: false }, "text")
    .then((text: string) => {
      if (reached(text)) {
        cy.log(`reached after ${typed} lessons`);
        return cy.wrap(typed, { log: false });
      }
      const max = options.maxLessons ?? DEFAULT_MAX_LESSONS;
      if (typed >= max) {
        throw new Error(`${selector} still reads ${JSON.stringify(text)} after ${typed} lessons`);
      }
      cy.completeLesson(options);
      return lessonsUntil(selector, reached, options, typed + 1);
    });
}

Cypress.Commands.add("completeLessonsUntilUnlocked", (count: number, options: LessonLoopOptions = {}) => {
  return lessonsUntil("[data-cy=unlocked-count]", (text) => Number(text) >= count, options, 0);
});

Cypress.Commands.add("openSettings", () => {
  cy.get("[data-cy=open-settings]").click();
  cy.get("[data-cy=settings]").should("be.visible");
});

Cypress.Commands.add("openRecitationSettings", () => {
  cy.get("[data-cy=open-settings]").click();
  cy.get("[data-cy=settings]").should("be.visible");
  cy.get("[data-cy=open-recitation-settings]").click();
  cy.get("[data-cy=recitation-settings]").should("be.visible");
});

Cypress.Commands.add("closeRecitationSettings", () => {
  cy.get("[data-cy=recitation-settings-done]").click();
  cy.get("[data-cy=recitation-settings]").should("not.be.visible");
});

Cypress.Commands.add("openCustomTextSettings", () => {
  cy.get("[data-cy=open-settings]").click();
  cy.get("[data-cy=settings]").should("be.visible");
  cy.get("[data-cy=open-custom-text-settings]").click();
  cy.get("[data-cy=custom-text]").should("be.visible");
});

Cypress.Commands.add("closeCustomTextSettings", () => {
  cy.get("[data-cy=custom-text-done]").click();
  cy.get("[data-cy=custom-text]").should("not.be.visible");
});

Cypress.Commands.add("closeSettings", () => {
  cy.get("[data-cy=settings-done]").click();
  cy.get("[data-cy=settings]").should("not.be.visible");
});

Cypress.Commands.add("showStats", () => {
  cy.get("[data-cy=nav-stats]").click();
  cy.get("[data-cy=stats]").should("be.visible");
});

Cypress.Commands.add("showPractice", () => {
  cy.get("[data-cy=nav-practice]").click();
  cy.get("[data-cy=typing-area]").should("be.visible");
});
