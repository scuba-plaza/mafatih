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

  it("gives a fresh profile a letter drill in Practice from the start", () => {
    cy.contains("button", "Practice").click();
    cy.contains("Focus letter").should("be.visible");
    cy.get(".typing-line")
      .first()
      .invoke("text")
      .then((text) => {
        for (const letter of text.trim().replaceAll(" ", "")) {
          assert.equal(letter, "ب");
        }
      });
    cy.get("input[aria-label*='Typing area']").should("exist");
  });

  it("types the first character of a practice drill once letters are unlocked", () => {
    const profile = {
      version: 2,
      progress: {
        unlocked: ["ب", "ي", "ل", "ا", "ت", "ن", "م", "ك", "ش", "س", "ع", "ف", "ه", "د", "ق", "ر"],
        tier: "none",
        stats: {},
      },
      settings: { tierOverride: "auto", fingerColors: true },
      recitation: {},
    };
    cy.window().then((window) => {
      window.localStorage.setItem("mafatih.profile.v2", JSON.stringify(profile));
    });
    cy.contains("button", "Practice").click();
    cy.contains("Focus letter").should("be.visible");
    cy.get(".typing-line")
      .first()
      .invoke("text")
      .then((text) => {
        const trimmed = text.trim();
        assert.isAbove(trimmed.length, 0);
        const first = trimmed.charAt(0);
        cy.get("input[aria-label*='Typing area']").click();
        cy.get("input[aria-label*='Typing area']").type(first, { delay: 10 });
        cy.get(".typing-done").should("contain.text", first);
      });
  });

  it("shows the confirmation dialog before resetting progress", () => {
    cy.contains("button", "Settings").click();
    cy.contains("button", "Reset all progress…").click();
    cy.get("[role='alertdialog']").should("contain.text", "Reset all progress?");
    cy.contains("button", "Cancel").click();
    cy.get("[role='alertdialog']").should("not.exist");
  });

  it("opens a surah and shows its first ayah in order", () => {
    cy.get("button[aria-label*='Al-Faatiha']").click();
    cy.contains("Ayah 1 of 7").should("be.visible");
    cy.get(".typing-line").should("be.visible");
  });
});

describe("Mafatih v2 extras", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.visit("/");
  });

  it("colours keys by finger in Practice", () => {
    cy.contains("button", "Practice").click();
    cy.get(".key-cap.finger-0").should("exist");
  });

  it("opens and closes the privacy dialog", () => {
    cy.contains("button", "Privacy").click();
    cy.get("[role='dialog']").should("contain.text", "Privacy");
    cy.contains("button", "Close").click();
    cy.get("[role='dialog']").should("not.exist");
  });

  it("lets settings turn off finger colours", () => {
    cy.contains("button", "Practice").click();
    cy.get(".key-cap.finger-0").should("exist");
    cy.contains("button", "Settings").click();
    cy.get("input[type='checkbox']").uncheck();
    cy.contains("button", "Practice").click();
    cy.get(".key-cap.finger-0").should("not.exist");
  });
});
