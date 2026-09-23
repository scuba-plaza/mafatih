describe("a practice lesson", () => {
  beforeEach(() => {
    cy.visit("/?seed=1234");
  });

  it("renders a right-to-left lesson with attribution on first run", () => {
    cy.get("[data-cy=typing-area]").should("have.attr", "dir", "rtl").and("have.attr", "lang", "ar");
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "adaptive");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    cy.targetText().should("have.length.greaterThan", 10);
    cy.get("[data-cy=completion]").should("not.exist");
  });

  it("starts at tier none so a fresh profile types letters only", () => {
    cy.get("[data-cy=tier]").should("have.text", "none");
    cy.targetText().then((text) => {
      expect(text).to.not.match(/[ً-ْ]/, "a tier-none lesson must carry no harakat");
    });
  });

  it("advances the cursor one position per correct key", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      cy.typeArabic(chars.slice(0, 3).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "3");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "ok");
    });
  });

  it("completes the lesson and reports stats when typed correctly", () => {
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
    cy.get("[data-cy=summary-accuracy]").should("have.text", "100");
    cy.get("[data-cy=hud-errors]").should("have.text", "0");
  });

  it("refuses to advance past a wrong key and counts it as an error", () => {
    cy.targetText().then((text) => {
      const first = [...text][0] as string;
      const wrong = first === "ز" ? "ظ" : "ز";
      cy.typeArabic(wrong);
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "error");
      cy.get("[data-cy=caret]").should("have.attr", "data-error", "true");
      cy.get("[data-cy=hud-errors]").should("have.text", "1");

      cy.typeArabic(first);
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "1");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "ok");
      cy.get("[data-cy=hud-errors]").should("have.text", "1");
    });
  });

  it("issues a new lesson the moment the old one is solved", () => {
    cy.targetText().then((first) => {
      cy.typeTarget();
      cy.get("[data-cy=completion]").should("be.visible");
      cy.get("[data-cy=next-lesson]").should("not.exist");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
      cy.get("[data-cy=hud-cpm]").should("have.text", "0");
      cy.targetText().should("not.equal", first);
    });
  });

  it("keeps every rendered text run unbroken so shaping survives", () => {
    cy.get("[data-seg-start]").each(($span) => {
      const node = $span[0] as HTMLElement;
      expect(node.childNodes.length, "a text run must be a single text node").to.equal(1);
      expect(node.childNodes[0]?.nodeType, "that node must be a text node").to.equal(3);
    });
    cy.get("[data-cy=line]").each(($line) => {
      const runs = [...($line[0] as HTMLElement).querySelectorAll("[data-seg-start]")];
      expect(runs.length, "an adaptive lesson has no ayat, so no line is ever cut").to.equal(1);
    });
  });

  it("highlights the key for the next character on the virtual keyboard", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      cy.get("[data-cy=keycap][data-target=true]").should("have.length", 1);
      cy.typeArabic(chars.slice(0, 1).join(""));
      cy.get("[data-cy=virtual-keyboard]").should("have.attr", "data-next-code").and("not.be.empty");
      cy.get("[data-cy=keycap][data-target=true]").should("have.length", 1);
    });
  });
});
