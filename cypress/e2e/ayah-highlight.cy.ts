import type { FontId } from "../../src/engine/fonts.ts";
import { visitWith } from "../support/profile.ts";

const CDN = "https://everyayah.com/data/**/*.mp3";
const SLACK = 0.5;
const TALL_STACK = /[ًٌٍ]|آ|[أإئؤء][َُِ]/;

interface Case {
  surah: number;
  font: FontId;
  fontSize: number;
  contains: string;
}

const CASES: Case[] = [
  { surah: 88, font: "naskh", fontSize: 72, contains: "حَامِيَةً" },
  { surah: 88, font: "amiri", fontSize: 48, contains: "نَارًا" },
  { surah: 19, font: "scheherazade", fontSize: 72, contains: "خَفِيًّا" },
  { surah: 19, font: "naskh", fontSize: 72, contains: "نِدَاءً" },
  { surah: 41, font: "naskh", fontSize: 56, contains: "قُرْآنًا" },
  { surah: 112, font: "amiri", fontSize: 28, contains: "أَحَدٌ" },
  { surah: 2, font: "naskh", fontSize: 64, contains: "هُدًى" },
];

function utf16Offset(text: string, charIndex: number): number {
  let offset = 0;
  let seen = 0;
  for (const char of text) {
    if (seen >= charIndex) {
      break;
    }
    offset += char.length;
    seen += 1;
  }
  return offset;
}

function assertBandsCoverTheirCharacters(): void {
  cy.get("[data-cy=ayah-band]").should("exist");
  cy.window().then((win) => {
    cy.get("[data-cy=typing-area]").should(($area) => {
      const bands = [...($area[0] as HTMLElement).querySelectorAll<HTMLElement>("[data-cy=ayah-band]")];
      expect(bands.length, "the recited ayah must be marked").to.be.greaterThan(0);

      for (const band of bands) {
        const line = band.closest("[data-cy=line]") as HTMLElement;
        const from = Number(band.dataset.from);
        const to = Number(band.dataset.to);

        const segment = [...line.querySelectorAll<HTMLElement>("[data-seg-start]")].find(
          (seg) => Number(seg.dataset.segStart) <= from && to <= Number(seg.dataset.segEnd),
        );
        expect(segment, `a band at ${from}..${to} must sit inside one text run`).to.not.equal(undefined);
        if (segment === undefined) {
          return;
        }

        const segStart = Number(segment.dataset.segStart);
        const full = segment.textContent ?? "";
        const node = segment.firstChild as Text;
        const text = [...full].slice(from - segStart, to - segStart).join("");
        expect(text.length, "a band must cover real characters").to.be.greaterThan(0);

        const range = win.document.createRange();
        range.setStart(node, utf16Offset(full, from - segStart));
        range.setEnd(node, utf16Offset(full, to - segStart));
        const laid = range.getBoundingClientRect();
        range.detach();

        const box = band.getBoundingClientRect();
        expect(box.left, `${text}: left edge`).to.be.at.most(laid.left + SLACK);
        expect(box.right, `${text}: right edge`).to.be.at.least(laid.right - SLACK);

        const style = win.getComputedStyle(segment);
        const context = win.document.createElement("canvas").getContext("2d");
        expect(context, "canvas 2d context").to.not.equal(null);
        if (context === null) {
          return;
        }
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = context.measureText(text);
        const baseline = segment.getBoundingClientRect().top + metrics.fontBoundingBoxAscent;
        const inkTop = baseline - metrics.actualBoundingBoxAscent;
        const inkBottom = baseline + metrics.actualBoundingBoxDescent;

        expect(inkBottom - inkTop, `${text}: measured ink`).to.be.greaterThan(0);
        expect(box.top, `${text}: the mark must reach above the tallest harakat`).to.be.at.most(inkTop + SLACK);
        expect(box.bottom, `${text}: the mark must reach below the deepest descender`).to.be.at.least(
          inkBottom - SLACK,
        );
      }
    });
  });
}

describe("the mark on the recited ayah", () => {
  beforeEach(() => {
    cy.intercept("GET", CDN, { fixture: "ayah-long.mp3,null", headers: { "content-type": "audio/mpeg" } }).as("ayah");
  });

  for (const testCase of CASES) {
    const { surah, font, fontSize, contains } = testCase;
    it(`encloses every character of surah ${surah} in ${font} at ${fontSize}px`, () => {
      visitWith({
        surah,
        settings: {
          mode: "recite",
          tierOverride: "full",
          font,
          fontSize,
          showKeyboard: false,
          autoAdvance: false,
        },
      });
      cy.targetText().should("contain", contains);
      cy.targetText().should("match", TALL_STACK);

      cy.get("[data-cy=recitation-toggle]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
      assertBandsCoverTheirCharacters();

      cy.get("[data-cy=recitation-next]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
      assertBandsCoverTheirCharacters();

      cy.get("[data-cy=recitation-next]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "2");
      assertBandsCoverTheirCharacters();
    });
  }

  it("covers an ayah on every line it wraps onto", () => {
    visitWith({
      surah: 2,
      settings: {
        mode: "recite",
        tierOverride: "full",
        fontSize: 72,
        showKeyboard: false,
        autoAdvance: false,
      },
    });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "2");
    cy.get("[data-cy=ayah-band]").should("have.length.greaterThan", 1);
    assertBandsCoverTheirCharacters();
  });

  it("marks nothing once playback stops", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full", showKeyboard: false } });
    cy.get("[data-cy=ayah-band]").should("not.exist");
  });
});
