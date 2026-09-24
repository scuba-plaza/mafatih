import { visitWith } from "../support/profile.ts";

const directionOf = ($el: JQuery<HTMLElement>): string =>
  ($el[0] as HTMLElement).ownerDocument.defaultView?.getComputedStyle($el[0] as HTMLElement).direction ?? "";

describe("text direction", () => {
  it("renders the document left-to-right", () => {
    cy.visit("/?seed=5");
    cy.get("html").should("have.attr", "dir", "ltr");
    cy.get("[data-cy=app]").should(($el) => expect(directionOf($el)).to.equal("ltr"));
  });

  it("keeps English prose left-to-right so trailing punctuation stays at the end", () => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=attribution]").should(($el) => {
      expect(directionOf($el)).to.equal("ltr");
      expect($el.text().trim()).to.match(/\.$/);
    });
    cy.get("footer").should(($el) => expect(directionOf($el)).to.equal("ltr"));
    cy.get("[data-cy=hud]").should(($el) => expect(directionOf($el)).to.equal("ltr"));
    cy.openSettings();
    cy.get("[data-cy=settings]").should(($el) => expect(directionOf($el)).to.equal("ltr"));
    cy.closeSettings();
    cy.showStats();
    cy.get("[data-cy=progress]").should(($el) => expect(directionOf($el)).to.equal("ltr"));
  });

  it("keeps the layout guard left-to-right with its period at the end", () => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]").should("exist");
    cy.typeRawKey("h", "KeyH");
    cy.get("[data-cy=layout-guard]").should(($el) => {
      expect(directionOf($el)).to.equal("ltr");
      expect($el.find("p").first().text().trim()).to.match(/\.$/);
    });
  });

  it("still renders the lesson itself right-to-left", () => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]")
      .should("have.attr", "dir", "rtl")
      .and(($el) => expect(directionOf($el)).to.equal("rtl"));
  });

  it("isolates the Arabic surah name inside otherwise LTR attribution", () => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=attribution]").should(($el) => {
      expect(directionOf($el)).to.equal("ltr");
      expect($el.text()).to.contain("112:");
    });
    cy.get("[data-cy=attribution] [lang=ar]").should(($el) => expect(directionOf($el)).to.equal("rtl"));
  });
});

describe("hiding the virtual keyboard", () => {
  beforeEach(() => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("shows the keyboard by default", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-show-keyboard]").should("be.checked");
    cy.closeSettings();
    cy.get("[data-cy=virtual-keyboard]").should("exist");
  });

  it("docks to the bottom of the window, clear of the edge, over a long passage", () => {
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "full", ayatPerLesson: 20 } });
    cy.get("[data-cy=keyboard-dock]").should("have.css", "position", "sticky");
    cy.get("[data-cy=keyboard-dock]").should("have.css", "background-color").and("not.equal", "rgba(0, 0, 0, 0)");

    cy.window().then((win) => {
      expect(win.document.documentElement.scrollHeight, "the passage must be long enough to scroll").to.be.greaterThan(
        win.innerHeight,
      );
      cy.scrollTo("top");
      cy.get("[data-cy=keyboard-dock]")
        .should("be.visible")
        .should(($dock) => {
          const gap = win.innerHeight - ($dock[0] as HTMLElement).getBoundingClientRect().bottom;
          expect(gap, "the dock keeps a margin from the bottom edge").to.be.within(20, 32);
        });
    });
  });

  it("leaves no dock behind when the keyboard is hidden", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-show-keyboard]").uncheck();
    cy.closeSettings();
    cy.get("[data-cy=keyboard-dock]").should("not.exist");
  });

  it("hides and restores it from the settings", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-show-keyboard]").uncheck();
    cy.get("[data-cy=virtual-keyboard]").should("not.exist");
    cy.get("[data-cy=setting-show-keyboard]").check();
    cy.get("[data-cy=virtual-keyboard]").should("exist");
  });

  it("remembers the choice across a reload", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-show-keyboard]").uncheck();
    cy.closeSettings();
    cy.get("[data-cy=virtual-keyboard]").should("not.exist");
    cy.reload();
    cy.get("[data-cy=virtual-keyboard]").should("not.exist");
    cy.openSettings();
    cy.get("[data-cy=setting-show-keyboard]").should("not.be.checked");
  });

  it("still accepts typing while the keyboard is hidden", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-show-keyboard]").uncheck();
    cy.closeSettings();
    cy.get("[data-cy=virtual-keyboard]").should("not.exist");
    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 3).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "3");
    });
  });
});

describe("keyboard layout selection", () => {
  beforeEach(() => {
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "full" } });
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("defaults to Arabic (101), with the shadda on the backtick", () => {
    cy.get("[data-cy=virtual-keyboard]").should("have.attr", "data-layout", "win101");
    cy.get("[data-cy=keycap][data-code=Backquote]").should("contain.text", "ّ");
    cy.get("[data-cy=keycap][data-code=KeyA]").should("contain.text", "ِ");
    cy.get("[data-cy=keycap][data-code=KeyU]").should("contain.text", "‘");
    cy.openSettings();
    cy.get("[data-cy=setting-layout]").should("have.value", "win101");
    cy.get("[data-cy=setting-layout] option").should("have.length", 2);
    cy.get("[data-cy=setting-layout] option").first().should("have.text", "Arabic (101)");
    cy.get("[data-cy=setting-layout] option[value=pc102]").should("not.exist");
  });

  it("switches to Arabic (Macintosh) and moves the shadda onto a letter key", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-layout]").select("mac");
    cy.closeSettings();
    cy.get("[data-cy=virtual-keyboard]").should("have.attr", "data-layout", "mac");
    cy.get("[data-cy=keycap][data-code=KeyI]").should("contain.text", "ّ");
    cy.get("[data-cy=keycap][data-code=Backquote]").should("not.contain.text", "ّ");
  });

  it("accepts the lam-alef key the way Windows sends it, as two letters at once", () => {
    visitWith({ settings: { mode: "custom", customText: "لا", tierOverride: "none" } });
    cy.targetText().should("equal", "لا");
    cy.typeRawKey("لا", "KeyB");
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
  });

  it("remembers the layout across a reload", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-layout]").select("mac");
    cy.closeSettings();
    cy.reload();
    cy.get("[data-cy=virtual-keyboard]").should("have.attr", "data-layout", "mac");
    cy.openSettings();
    cy.get("[data-cy=setting-layout]").should("have.value", "mac");
  });

  it("highlights the Macintosh key for the next character", () => {
    cy.targetText().then((text) => {
      const chars = [...text];
      const i = chars.findIndex((c) => /[ً-ْ]/.test(c));
      cy.typeArabic(chars.slice(0, i).join(""));
      cy.get("[data-cy=keycap][data-target=true]").should("have.length", 1);
      cy.get("[data-cy=keycap][data-target=true]").should("contain.text", chars[i] as string);
      cy.get("[data-cy=shift-key]").should("have.attr", "data-active", "true");
    });
  });

  it("types a full diacritised passage on either layout", () => {
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
  });
});

describe("font selection", () => {
  const stackOf = (win: Cypress.AUTWindow): string =>
    win.getComputedStyle(win.document.documentElement).getPropertyValue("--font-arabic-active").trim();

  beforeEach(() => {
    cy.visit("/?seed=5");
    cy.get("[data-cy=typing-area]").should("exist");
  });

  it("offers three Arabic faces", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-font] option").should("have.length", 3);
    for (const name of ["Scheherazade New", "Noto Naskh Arabic", "Amiri"]) {
      cy.get("[data-cy=setting-font]").should("contain.text", name);
    }
  });

  it("defaults to Noto Naskh Arabic", () => {
    cy.get("[data-cy=app]").should("have.attr", "data-font", "naskh");
    cy.window().should((win) => expect(stackOf(win)).to.contain("Noto Naskh Arabic"));
    cy.get("[data-cy=line-untyped]")
      .first()
      .should((el) => expect(el.css("font-family")).to.contain("Noto Naskh Arabic"));
    cy.openSettings();
    cy.get("[data-cy=setting-font]").should("have.value", "naskh");
  });

  it("applies the chosen face to the lesson text", () => {
    cy.openSettings();
    for (const [id, family] of [
      ["amiri", "Amiri"],
      ["scheherazade", "Scheherazade New"],
    ] as [string, string][]) {
      cy.get("[data-cy=setting-font]").select(id);
      cy.get("[data-cy=app]").should("have.attr", "data-font", id);
      cy.window().should((win) => expect(stackOf(win)).to.contain(family));
      cy.get("[data-cy=line-untyped]")
        .first()
        .should((el) => {
          expect(el.css("font-family")).to.contain(family);
        });
    }
  });

  it("shows a vocalised sample that renders in the chosen face", () => {
    cy.openSettings();
    cy.get("[data-cy=font-sample]").should("be.visible").and("contain.text", "بِسْمِ");
    cy.get("[data-cy=setting-font]").select("amiri");
    cy.get("[data-cy=font-sample]").should((el) => expect(el.css("font-family")).to.contain("Amiri"));
  });

  it("remembers the face across a reload", () => {
    cy.openSettings();
    cy.get("[data-cy=setting-font]").select("amiri");
    cy.closeSettings();
    cy.reload();
    cy.get("[data-cy=app]").should("have.attr", "data-font", "amiri");
    cy.openSettings();
    cy.get("[data-cy=setting-font]").should("have.value", "amiri");
  });

  it("each face actually loads rather than silently falling back", () => {
    cy.document().then((doc) => {
      const families = new Set([...doc.fonts].map((f) => f.family.replace(/"/g, "")));
      for (const name of ["Scheherazade New", "Noto Naskh Arabic", "Amiri"]) {
        expect(families.has(name), `${name} should be declared`).to.equal(true);
      }
    });
  });
});

describe("search and sharing metadata", () => {
  beforeEach(() => {
    cy.visit("/?seed=5");
  });

  it("describes the page for search engines and link previews", () => {
    cy.title().should("contain", "Mafatih");
    cy.get('head meta[name="description"]')
      .should("have.attr", "content")
      .and("match", /Arabic touch-typing/);
    cy.get('head link[rel="canonical"]')
      .should("have.attr", "href")
      .and("match", /^https:\/\/.+\/$/);
    for (const property of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
      cy.get(`head meta[property="${property}"]`).should("have.attr", "content").and("not.be.empty");
    }
    cy.get('head meta[property="og:image"]')
      .should("have.attr", "content")
      .and("match", /^https:\/\/.+og-image\.png$/);
    cy.get('head meta[name="twitter:card"]').should("have.attr", "content", "summary_large_image");
    cy.get('head script[type="application/ld+json"]').then(($script) => {
      const data = JSON.parse($script.text());
      expect(data["@type"]).to.equal("WebApplication");
      expect(data.url).to.match(/^https:\/\//);
    });
  });

  it("serves every icon, the manifest, the share image, robots.txt and the sitemap", () => {
    cy.get('head link[rel~="icon"], head link[rel="apple-touch-icon"], head link[rel="manifest"]').each(($link) => {
      cy.request($link.attr("href") as string)
        .its("status")
        .should("equal", 200);
    });
    cy.request("/site.webmanifest").then((response) => {
      const manifest = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
      expect(manifest.name).to.contain("Mafatih");
      for (const icon of manifest.icons as { src: string }[]) {
        cy.request(`/${icon.src}`).its("status").should("equal", 200);
      }
    });
    cy.request("/og-image.png").its("headers").its("content-type").should("contain", "image/png");
    cy.request("/robots.txt")
      .its("body")
      .should("match", /Sitemap: https:\/\/.+\/sitemap\.xml/);
    cy.request("/sitemap.xml").its("body").should("contain", "<urlset").and("contain", "<loc>https://");
  });
});
