import { visitWith } from "../support/profile.ts";

describe("Arabic rendering", () => {
  beforeEach(() => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("keeps a mid-word letter joined rather than isolated", () => {
    cy.get("[data-seg-start]")
      .first()
      .then(($span) => {
        const el = $span[0] as HTMLElement;
        const node = el.childNodes[0] as Text;
        const text = node.textContent ?? "";
        const index = text.indexOf("سم");
        expect(index, "the passage should contain a joined seen").to.be.greaterThan(-1);

        const range = el.ownerDocument.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const joined = range.getBoundingClientRect().width;

        const probe = el.ownerDocument.createElement("span");
        probe.setAttribute("lang", "ar");
        probe.style.font = el.ownerDocument.defaultView?.getComputedStyle(el).font ?? "";
        probe.style.position = "absolute";
        probe.textContent = "س";
        el.parentElement?.appendChild(probe);
        const isolated = probe.getBoundingClientRect().width;
        probe.remove();

        expect(joined, "a joined seen must be narrower than an isolated one").to.be.lessThan(isolated);
      });
  });

  it("moves the caret leftwards as the cursor advances in RTL", () => {
    const seen: number[] = [];
    const recordAt = (cursor: number) => {
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(cursor));
      cy.get("[data-cy=caret]")
        .should("be.visible")
        .then(($c) => {
          seen.push(($c[0] as HTMLElement).getBoundingClientRect().left);
        });
    };

    cy.targetText().then((text) => {
      const chars = [...text];
      recordAt(0);
      cy.typeArabic(chars.slice(0, 4).join(""));
      recordAt(4);
      cy.typeArabic(chars.slice(4, 8).join(""));
      recordAt(8);
      cy.then(() => {
        expect(seen, "three caret samples").to.have.length(3);
        expect(seen[1], "caret should move left after 4 chars").to.be.lessThan(seen[0] as number);
        expect(seen[2], "caret should keep moving left after 8").to.be.lessThan(seen[1] as number);
      });
    });
  });

  it("reveals the typed layer progressively via clip-path", () => {
    cy.get("[data-cy=line-typed]").first().should("have.css", "clip-path").and("not.equal", "none");
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 5).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "5");
      cy.get("[data-cy=line-typed]").first().should("have.css", "clip-path").and("not.equal", "none");
    });
  });

  it("ghosts an expected haraka but never an expected letter", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full" } });
    cy.get("[data-cy=typing-area]").should("exist");
    cy.get("[data-cy=ghost-haraka]").should("not.exist");
    cy.targetText().then((text) => {
      const chars = [...text];
      const i = chars.findIndex((c) => /[ً-ْ]/.test(c));
      cy.typeArabic(chars.slice(0, i).join(""));
      cy.get("[data-cy=ghost-haraka]").should("have.attr", "data-char", chars[i]);
    });
  });

  it("wraps long passages onto several lines without leading spaces", () => {
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=line]").should("have.length.greaterThan", 1);
    cy.get("[data-cy=line-untyped]").each(($span) => {
      expect($span.text().startsWith(" ")).to.equal(false);
    });
  });

  it("keeps every line inside the column at any viewport width", () => {
    for (const width of [1280, 768, 390]) {
      cy.viewport(width, 800);
      visitWith({ surah: 67, settings: { mode: "recite", tierOverride: "none" } });
      cy.get("[data-cy=line]").should("have.length.greaterThan", 1);
      cy.get("[data-cy=typing-area]").then(($area) => {
        const column = ($area[0] as HTMLElement).getBoundingClientRect();
        cy.get("[data-cy=line-untyped]").each(($span) => {
          const line = ($span[0] as HTMLElement).getBoundingClientRect();
          expect(
            Math.round(line.width),
            `at ${width}px wide a line must fit the ${Math.round(column.width)}px column`,
          ).to.be.at.most(Math.round(column.width));
        });
      });
    }
  });

  it("re-chunks the lesson when the window is resized", () => {
    cy.viewport(1280, 800);
    visitWith({ surah: 67, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=line]").then(($wide) => {
      const wide = $wide.length;
      cy.viewport(420, 800);
      cy.get("[data-cy=line]").should("have.length.greaterThan", wide);
      cy.get("[data-cy=typing-area]").then(($area) => {
        const column = ($area[0] as HTMLElement).getBoundingClientRect();
        cy.get("[data-cy=line-untyped]").each(($span) => {
          expect(
            Math.round(($span[0] as HTMLElement).getBoundingClientRect().width),
            "a narrowed window re-breaks the lesson to fit",
          ).to.be.at.most(Math.round(column.width));
        });
      });
    });
  });

  it("keeps every line inside the column whatever the diacritic tier", () => {
    for (const tier of ["none", "core", "full"] as const) {
      visitWith({ surah: 67, settings: { mode: "recite", tierOverride: tier } });
      cy.get("[data-cy=line]").should("have.length.greaterThan", 1);
      cy.get("[data-cy=typing-area]").then(($area) => {
        const column = ($area[0] as HTMLElement).getBoundingClientRect();
        cy.get("[data-cy=line-untyped]").each(($span) => {
          const line = ($span[0] as HTMLElement).getBoundingClientRect();
          expect(
            Math.round(line.width),
            `a line of ${tier} text must fit the ${Math.round(column.width)}px column`,
          ).to.be.at.most(Math.round(column.width));
          expect(Math.round(line.left), "and must not spill past the left edge of the column").to.be.at.least(
            Math.round(column.left),
          );
        });
      });
    }
  });
});

describe("the on-screen keyboard", () => {
  beforeEach(() => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full" } });
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("staggers the rows like a real keyboard", () => {
    cy.get("[data-cy=keycap]").then(($caps) => {
      const left = (code: string): number => {
        const cap = $caps.filter(`[data-code=${code}]`)[0];
        expect(cap, code).to.exist;
        return (cap as HTMLElement).getBoundingClientRect().left;
      };
      const unit = left("Digit1") - left("Backquote");
      const offset = (code: string, from: string): number => (left(code) - left(from)) / unit;
      expect(offset("KeyQ", "Backquote"), "Q sits 1.5 keys in").to.be.closeTo(1.5, 0.05);
      expect(offset("KeyA", "KeyQ"), "A sits a quarter key right of Q").to.be.closeTo(0.25, 0.05);
      expect(offset("KeyZ", "KeyA"), "Z sits half a key right of A").to.be.closeTo(0.5, 0.05);
      expect(offset("Space", "Backquote"), "the spacebar starts under C").to.be.closeTo(3.75, 0.05);
    });
  });

  it("places every haraka on its documented Arabic (101) key", () => {
    const expected: [string, string][] = [
      ["َ", "KeyQ"],
      ["ً", "KeyW"],
      ["ُ", "KeyE"],
      ["ٌ", "KeyR"],
      ["ِ", "KeyA"],
      ["ٍ", "KeyS"],
      ["ْ", "KeyX"],
      ["ّ", "Backquote"],
    ];
    for (const [char, code] of expected) {
      cy.get(`[data-cy=keycap][data-code=${code}]`).should("contain.text", char);
    }
  });

  it("raises the shift indicator exactly when the next character needs it", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      const i = chars.findIndex((c) => /[ً-ْ]/.test(c));
      cy.get("[data-cy=shift-key]").should("have.attr", "data-active", "false");
      cy.typeArabic(chars.slice(0, i).join(""));
      cy.get("[data-cy=shift-key]").should("have.attr", "data-active", "true");
      cy.typeArabic(chars[i] as string);
      cy.get("[data-cy=shift-key]").should("have.attr", "data-active", "false");
    });
  });

  it("targets exactly one key at a time and follows the cursor", () => {
    cy.get("[data-cy=keycap][data-target=true]").should("have.length", 1);
    cy.get("[data-cy=virtual-keyboard]")
      .invoke("attr", "data-next-code")
      .then((first) => {
        cy.targetText().then((text) => {
          cy.typeArabic([...text].slice(0, 1).join(""));
          cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "1");
          cy.get("[data-cy=keycap][data-target=true]").should("have.length", 1);
          cy.get("[data-cy=virtual-keyboard]").invoke("attr", "data-next-code").should("not.equal", first);
        });
      });
  });

  it("targets the spacebar when a word boundary comes next", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      const space = chars.indexOf(" ");
      cy.typeArabic(chars.slice(0, space).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", String(space));
      cy.get("[data-cy=keycap][data-code=Space]").should("have.attr", "data-target", "true");
    });
  });
});

function lineStarts($lines: JQuery<HTMLElement>): string[] {
  return $lines.toArray().map((line) => line.querySelector("[data-seg-start]")?.getAttribute("data-seg-start") ?? "");
}

function settledLineStarts(attempts = 10): Cypress.Chainable<string[]> {
  return cy.get("[data-cy=line]").then(($first) => {
    const first = lineStarts($first);
    cy.wait(400);
    return cy.get("[data-cy=line]").then(($second) => {
      const second = lineStarts($second);
      if (JSON.stringify(first) === JSON.stringify(second) || attempts <= 1) {
        return cy.wrap(second);
      }
      return settledLineStarts(attempts - 1);
    });
  });
}

describe("following the cursor down a long passage", () => {
  const visibleBottom = (win: Cypress.AUTWindow): number => {
    const dock = win.document.querySelector("[data-cy=keyboard-dock]");
    return dock === null ? win.innerHeight : dock.getBoundingClientRect().top;
  };

  it("centres the new line above the keyboard whenever the cursor moves onto it", () => {
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 20, fontSize: 72 } });
    cy.document().its("fonts.status").should("equal", "loaded");
    cy.get("[data-cy=line]").should("have.length.greaterThan", 8);
    cy.window().its("scrollY").should("equal", 0);
    settledLineStarts().as("startsBefore");
    cy.get("[data-cy=line]")
      .eq(6)
      .find("[data-seg-start]")
      .first()
      .invoke("attr", "data-seg-start")
      .then((start) => {
        cy.targetText().then((text) => {
          cy.typeArabic([...text].slice(0, Number(start)).join(""));
        });
      });
    cy.get("[data-cy=line]").eq(6).should("have.attr", "data-active", "true");
    cy.get("@startsBefore").then((before) => {
      cy.get("[data-cy=line]").then(($lines) => {
        expect(lineStarts($lines), "typing never reflows the lines").to.deep.equal(before);
      });
    });
    cy.window().then((win) => {
      cy.get("[data-cy=line]")
        .eq(6)
        .should(($line) => {
          const rect = ($line[0] as HTMLElement).getBoundingClientRect();
          const centre = rect.top + rect.height / 2;
          expect(Math.abs(centre - visibleBottom(win) / 2), "line centre vs visible centre").to.be.lessThan(24);
        });
    });
  });

  it("brings the next level's first line into view", () => {
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 5, fontSize: 72 } });
    cy.typeTarget();
    cy.get("[data-cy=attribution]").should("contain.text", "2:6");
    cy.window().then((win) => {
      cy.get("[data-cy=line]")
        .first()
        .should("have.attr", "data-active", "true")
        .and(($line) => {
          const rect = ($line[0] as HTMLElement).getBoundingClientRect();
          expect(rect.top, "the first line is not above the window").to.be.at.least(0);
          expect(rect.bottom, "the first line is not under the keyboard").to.be.at.most(visibleBottom(win));
        });
    });
  });
});
