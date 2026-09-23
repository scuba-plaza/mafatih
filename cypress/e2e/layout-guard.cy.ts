describe("keyboard layout guard", () => {
  beforeEach(() => {
    cy.visit("/?seed=3");
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("is hidden while nothing has been typed", () => {
    cy.get("[data-cy=layout-guard]").should("not.exist");
  });

  it("warns when the OS is sending Latin characters", () => {
    cy.typeRawKey("h", "KeyH");
    cy.get("[data-cy=layout-guard]").should("be.visible").and("contain.text", "setxkbmap ara");
  });

  it("does not score Latin keystrokes as errors", () => {
    cy.typeRawKey("h", "KeyH");
    cy.typeRawKey("e", "KeyE");
    cy.typeRawKey("l", "KeyL");
    cy.get("[data-cy=hud-errors]").should("have.text", "0");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "0");
    cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "ok");
  });

  it("can be dismissed and typing still works afterwards", () => {
    cy.typeRawKey("q", "KeyQ");
    cy.get("[data-cy=layout-guard]").should("be.visible");
    cy.get("[data-cy=layout-guard-dismiss]").click();
    cy.get("[data-cy=layout-guard]").should("not.exist");
    cy.targetText().then((text) => {
      cy.typeArabic([...text][0] as string);
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "1");
    });
  });
});
