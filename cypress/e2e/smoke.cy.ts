describe("Mafatih smoke", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
  });

  it("lands on Recitation by default and lists surahs", () => {
    cy.visit("/");
    cy.contains("Recitation").should("be.visible");
    cy.contains("Al-Faatiha").should("be.visible");
    cy.get("[aria-current='page']").should("have.text", "Recitation");
  });

  it("types a practice drill and unlocks nothing on errors", () => {
    cy.contains("button", "Practice").click();
    cy.contains("Focus letter").should("be.visible");
    cy.get("input[aria-label*='Typing area']").click();
    cy.get("input[aria-label*='Typing area']").type("ب", { delay: 10 });
    cy.get(".typing-done").should("contain.text", "ب");
  });

  it("shows the confirmation dialog before resetting progress", () => {
    cy.contains("button", "Settings").click();
    cy.contains("button", "Reset all progress…").click();
    cy.get("[role='alertdialog']").should("contain.text", "Reset all progress?");
    cy.contains("button", "Cancel").click();
    cy.get("[role='alertdialog']").should("not.exist");
  });

  it("opens a surah and shows its first ayah in order", () => {
    cy.contains("button[aria-label*='Al-Faatiha']").click();
    cy.contains("Ayah 1 of 7").should("be.visible");
    cy.get(".typing-line").should("be.visible");
  });
});
