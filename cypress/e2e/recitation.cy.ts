import { AUDIO_DB } from "../../src/storage/audio-cache.ts";
import { visitWith } from "../support/profile.ts";

const CDN = "https://everyayah.com/data/**/*.mp3";
const MURATTAL = "Abdul_Basit_Murattal_64kbps";
const MUJAWWAD = "Abdul_Basit_Mujawwad_128kbps";

function stubRecitation(seen?: string[]): void {
  cy.intercept("GET", CDN, (req) => {
    seen?.push(req.url);
    req.reply({ fixture: "ayah.mp3,null", headers: { "content-type": "audio/mpeg" } });
  }).as("ayah");
}

function stubLongRecitation(seen?: string[]): void {
  cy.intercept("GET", CDN, (req) => {
    seen?.push(req.url);
    req.reply({ fixture: "ayah-long.mp3,null", headers: { "content-type": "audio/mpeg" } });
  }).as("ayah");
}

function requested(): Cypress.Chainable<string[]> {
  return cy.get("@ayah.all").then((calls) => {
    const intercepts = calls as unknown as { request: { url: string } }[];
    return intercepts.map((call) => call.request.url);
  });
}

function visitRecite(surah = 112): void {
  stubRecitation();
  visitWith({ surah: surah, settings: { mode: "recite", tierOverride: "none", autoAdvance: false } });
}

function dropCache(): void {
  cy.window().then(
    (win) =>
      new Cypress.Promise<void>((resolve) => {
        const request = win.indexedDB.deleteDatabase(AUDIO_DB);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      }),
  );
}

function dragVolume(value: number): void {
  cy.window().then((win) => {
    cy.get("[data-cy=recitation-volume]").then(($input) => {
      const input = $input[0] as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new win.Event("input", { bubbles: true }));
      input.dispatchEvent(new win.Event("change", { bubbles: true }));
    });
  });
  cy.get("[data-cy=recitation-volume]").trigger("pointerup", { eventConstructor: "PointerEvent" });
}

describe("recitation playback", () => {
  beforeEach(() => {
    cy.visit("/", { failOnStatusCode: false });
    dropCache();
  });

  it("offers a player in recite mode only", () => {
    visitRecite();
    cy.get("[data-cy=recitation]").should("be.visible");

    stubRecitation();
    visitWith({ settings: { mode: "adaptive", tierOverride: "none" } });
    cy.get("[data-cy=attribution]").should("have.attr", "data-kind", "adaptive");
    cy.get("[data-cy=recitation]").should("not.exist");
  });

  it("names the reciter, the style, the bitrate and what plays next", () => {
    visitRecite();
    cy.get("[data-cy=recitation-label]").should("have.attr", "data-style", "Murattal");
    cy.get("[data-cy=recitation-label]").should("have.attr", "data-kbps", "64");
    cy.get("[data-cy=recitation-label]").should("contain.text", "Murattal 64 kbps");
    cy.get("[data-cy=recitation-label]").should("have.attr", "data-verse", "bismillah");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "false");

    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation-label]").should("have.attr", "data-verse", "112:1");
    cy.get("[data-cy=recitation-label]").should("contain.text", "112:1");
  });

  it("plays the first ayah of the passage", () => {
    visitRecite();
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.wait("@ayah");
    requested().should((urls) => {
      expect(urls.some((url) => url.endsWith(`/${MURATTAL}/112001.mp3`))).to.equal(true);
    });
  });

  it("skips ahead one ayah at a time and stops at the end of the passage", () => {
    visitRecite();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "basmala");
    for (const ayah of ["1", "2", "3", "4"]) {
      cy.get("[data-cy=recitation-next]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", ayah);
    }
    cy.get("[data-cy=recitation-label]").should("have.attr", "data-verse", "112:4");

    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "basmala");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "false");

    requested().should((urls) => {
      expect(urls.some((url) => url.endsWith(`/${MURATTAL}/112004.mp3`))).to.equal(true);
    });
  });

  it("rewinds to the previous ayah", () => {
    visitRecite();
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "2");
    cy.get("[data-cy=recitation-previous]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
    cy.get("[data-cy=recitation-previous]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "basmala");
    cy.get("[data-cy=recitation-previous]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "basmala");
  });

  it("never swallows the keystrokes that follow a control", () => {
    visitRecite();
    cy.targetText().then((text) => {
      const chars = [...text];
      cy.get("[data-cy=recitation-toggle]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
      cy.typeArabic(chars.slice(0, 3).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "3");
      cy.get("[data-cy=typing-area]").should("have.attr", "data-state", "ok");
    });
  });

  it("persists the volume once the slider is released", () => {
    visitRecite();
    dragVolume(0.25);
    cy.get("[data-cy=recitation-volume]").should("have.value", "0.25");
    cy.window().then((win) => {
      const raw = win.localStorage.getItem("mafatih.profile.v1") ?? "{}";
      expect(JSON.parse(raw).settings.volume).to.equal(0.25);
    });
  });

  it("mutes and unmutes without losing the level", () => {
    visitRecite();
    cy.get("[data-cy=recitation-mute]").click();
    cy.get("[data-cy=recitation-volume]").should("be.disabled").and("have.value", "0");
    cy.window().then((win) => {
      const raw = win.localStorage.getItem("mafatih.profile.v1") ?? "{}";
      expect(JSON.parse(raw).settings.muted).to.equal(true);
    });
    cy.get("[data-cy=recitation-mute]").click();
    cy.get("[data-cy=recitation-volume]").should("not.be.disabled").and("have.value", "0.8");
  });

  it("switches to the mujawwad set without restarting the lesson", () => {
    visitRecite();
    cy.targetText().then((before) => {
      cy.openRecitationSettings();
      cy.get("[data-cy=setting-reciter]").select("Mujawwad · 128 kbps");
      cy.closeRecitationSettings();

      cy.get("[data-cy=recitation-label]").should("have.attr", "data-style", "Mujawwad");
      cy.get("[data-cy=recitation-label]").should("have.attr", "data-kbps", "128");
      cy.targetText().should("equal", before);
      requested().should((urls) => {
        expect(urls.some((url) => url.includes(`/${MUJAWWAD}/`))).to.equal(true);
      });
    });
  });

  it("says so when the recitation cannot be fetched, and stays typeable", () => {
    cy.intercept("GET", CDN, { statusCode: 404, body: "" }).as("missing");
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=recitation]").should("have.attr", "data-failed", "true");
    cy.get("[data-cy=recitation-label]").should("contain.text", "Recitation unavailable");
    cy.get("[data-cy=recitation-toggle]").should("be.disabled");

    cy.targetText().then((text) => {
      cy.typeArabic([...text].slice(0, 2).join(""));
      cy.get("[data-cy=typing-area]").should("have.attr", "data-cursor", "2");
    });
  });
  it("runs on through the passage by default", () => {
    stubRecitation();
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none" } });
    cy.openRecitationSettings();
    cy.get("[data-cy=setting-auto-advance]").should("be.checked");
    cy.get("[data-cy=reciter-note]").should("contain.text", "runs on through the passage");
    cy.closeRecitationSettings();
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-ayah", "2");
  });

  it("stops at the end of the passage while the loop is off", () => {
    stubRecitation();
    visitWith({ surah: 112, settings: { mode: "recite", ayatPerLesson: 2, tierOverride: "none" } });
    cy.get("[data-cy=recitation]").should("have.attr", "data-loop", "false");
    cy.get("[data-cy=recitation-loop]").should("have.attr", "aria-pressed", "false");

    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-ayah", "2");
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-playing", "false");
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "2");
  });

  it("starts the passage over from the beginning once the loop is on", () => {
    stubRecitation();
    visitWith({ surah: 112, settings: { mode: "recite", ayatPerLesson: 2, tierOverride: "none" } });
    cy.get("[data-cy=recitation-loop]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-loop", "true");
    cy.get("[data-cy=recitation-loop]").should("have.attr", "aria-pressed", "true");

    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-ayah", "2");
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-ayah", "basmala");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
  });

  it("remembers the loop across a reload and wraps with the next button", () => {
    stubRecitation();
    visitWith({
      surah: 112,
      settings: { mode: "recite", ayatPerLesson: 2, tierOverride: "none", autoAdvance: false },
    });
    cy.get("[data-cy=recitation-loop]").click();
    cy.reload();
    cy.get("[data-cy=recitation]").should("have.attr", "data-loop", "true");

    for (const ayah of ["1", "2"]) {
      cy.get("[data-cy=recitation-next]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", ayah);
    }
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "basmala");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "false");
  });

  it("keeps stopping at each ayah while the loop is on but auto-advance is off", () => {
    stubRecitation();
    visitWith({
      surah: 112,
      settings: { mode: "recite", ayatPerLesson: 2, tierOverride: "none", autoAdvance: false, loop: true },
    });
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-playing", "false");
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
  });

  it("wraps at the true end of the passage even with auto-advance off", () => {
    stubRecitation();
    visitWith({
      surah: 112,
      settings: { mode: "recite", ayatPerLesson: 2, tierOverride: "none", autoAdvance: false, loop: true },
    });
    for (const ayah of ["1", "2"]) {
      cy.get("[data-cy=recitation-next]").click();
      cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", ayah);
    }
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-ayah", "basmala");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
  });

  it("stops at the end of an ayah once the setting is off", () => {
    visitRecite();
    cy.openRecitationSettings();
    cy.get("[data-cy=setting-auto-advance]").should("not.be.checked");
    cy.get("[data-cy=reciter-note]").should("contain.text", "stops at the end of each ayah");
    cy.closeRecitationSettings();
    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-playing", "false");
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
  });

  it("keeps playing into the next passage once the typed one is finished", () => {
    const seen: string[] = [];
    stubLongRecitation(seen);
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 1 } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.typeTarget();
    cy.get("[data-cy=attribution]").should("contain.text", "2:2");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true").and("have.attr", "data-ayah", "2");
    cy.wrap(null).should(() => {
      expect(seen.some((url) => url.endsWith("/002002.mp3"))).to.equal(true);
    });
  });

  it("keeps playing into the next surah after completing one", () => {
    const seen: string[] = [];
    stubLongRecitation(seen);
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 4 } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.typeTarget();
    cy.get("[data-cy=surah-complete]").should("be.visible");
    cy.get("[data-cy=story-bar]").should("have.attr", "data-surah", "113");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.get("[data-cy=recitation-label]").should("have.attr", "data-verse", "bismillah");
    cy.wrap(null).should(() => {
      expect(seen.some((url) => url.endsWith("/113001.mp3"))).to.equal(true);
    });
  });

  it("stays paused into the next passage when it was paused", () => {
    stubLongRecitation();
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 1 } });
    cy.typeTarget();
    cy.get("[data-cy=attribution]").should("contain.text", "2:2");
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "false");
  });

  it("pauses when another page is opened, and stays paused on return", () => {
    stubLongRecitation();
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.window().then((win) => {
      cy.spy(win.HTMLMediaElement.prototype, "pause").as("pause");
    });
    cy.showStats();
    cy.get("@pause").should("have.been.called");
    cy.showPractice();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "false");
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
  });

  it("stops playing when the lesson leaves recitation", () => {
    stubLongRecitation();
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "true");
    cy.openSettings();
    cy.get("[data-cy=setting-mode]").select("adaptive");
    cy.get("[data-cy=setting-mode]").select("recite");
    cy.closeSettings();
    cy.get("[data-cy=recitation]").should("have.attr", "data-playing", "false");
  });

  it("keeps fetched ayat so a reload costs no request", () => {
    const first: string[] = [];
    const second: string[] = [];

    stubRecitation(first);
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none", autoAdvance: false } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-failed", "false");
    cy.wrap(null).should(() => {
      expect(first, "a cold cache fetches from the cdn").to.have.length.greaterThan(0);
    });

    cy.openRecitationSettings();
    cy.get("[data-cy=audio-cache-usage]", { timeout: 10000 })
      .invoke("attr", "data-bytes")
      .then((bytes) => {
        expect(Number(bytes), "cached bytes").to.be.greaterThan(0);
      });
    cy.get("[data-cy=audio-cache-usage]").should("not.contain.text", "0 B ");
    cy.closeRecitationSettings();

    cy.then(() => {
      first.length = 0;
    });
    stubRecitation(second);
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none", autoAdvance: false } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-playing", "true");
    cy.get("[data-cy=recitation]").should("have.attr", "data-failed", "false");
    cy.wrap(null).should(() => {
      expect([...first, ...second], "a warm cache reaches the network not at all").to.have.length(0);
    });
  });

  it("deletes the cached audio on request and reports the space back", () => {
    visitRecite();
    cy.get("[data-cy=recitation-toggle]").click();
    cy.wait("@ayah");
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-failed", "false");

    cy.openRecitationSettings();
    cy.get("[data-cy=clear-audio-cache]", { timeout: 10000 }).should("not.be.disabled").click();
    cy.get("[data-cy=audio-cache-usage]").should("have.attr", "data-bytes", "0");
    cy.get("[data-cy=audio-cache-usage]").should("contain.text", "0 B · 0 ayat");
    cy.get("[data-cy=clear-audio-cache]").should("be.disabled");
  });
  it("plays the basmala that the passage actually shows", () => {
    const seen: string[] = [];
    stubRecitation(seen);
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "basmala");
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 15000 }).should("have.attr", "data-playing", "false");
    cy.wrap(null).should(() => {
      const files = seen.map((url) => url.slice(-10));
      expect(files, "the basmala on screen is recited before the ayah").to.include("001001.mp3");
      expect(files).to.include("002001.mp3");
      expect(files.indexOf("001001.mp3")).to.be.lessThan(files.indexOf("002001.mp3"));
    });
  });

  it("does not invent a basmala for a surah that has none", () => {
    const seen: string[] = [];
    stubRecitation(seen);
    visitWith({ surah: 9, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-playing", "false");
    cy.wrap(null).should(() => {
      expect(seen.map((url) => url.slice(-10))).to.not.include("001001.mp3");
    });
  });

  it("does not double the basmala in al-Fatiha, where it is ayah one", () => {
    const seen: string[] = [];
    stubRecitation(seen);
    visitWith({ surah: 1, settings: { mode: "recite", tierOverride: "none" } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-playing", "false");
    cy.wrap(null).should(() => {
      const opening = seen.map((url) => url.slice(-10)).filter((file) => file === "001001.mp3");
      expect(opening, "one basmala, not two").to.have.length(1);
    });
  });

  it("marks the ayah being recited, and only while it is being recited", () => {
    visitRecite(2);
    cy.get("[data-cy=ayah-band]").should("not.exist");
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get("[data-cy=ayah-band]").should("exist");
    cy.get("[data-cy=ayah-band]")
      .first()
      .should(($band) => {
        expect($band[0]?.getBoundingClientRect().width ?? 0, "the mark has real width").to.be.greaterThan(10);
      });
    cy.get("[data-cy=recitation]", { timeout: 10000 }).should("have.attr", "data-playing", "false");
  });

  it("marks the basmala on its own, never as part of ayah one", () => {
    stubRecitation();
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "full", autoAdvance: false } });
    cy.get("[data-cy=recitation-toggle]").click();
    cy.get('[data-cy=ayah-band][data-line-index="0"]').should("exist");
    cy.get("[data-cy=ayah-band]").should("have.length", 1);

    cy.get("[data-cy=recitation-next]").click();
    cy.get("[data-cy=recitation]").should("have.attr", "data-ayah", "1");
    cy.get("[data-cy=ayah-band]").should("exist");
    cy.get('[data-cy=ayah-band][data-line-index="0"]').should("not.exist");
  });

  it("gives the basmala a line of its own, centred", () => {
    visitRecite(2);
    cy.get("[data-cy=line]").first().should("have.attr", "data-centered", "true");
    cy.get("[data-cy=line]").eq(1).should("have.attr", "data-centered", "false");
    cy.get("[data-cy=line]")
      .first()
      .find("[data-cy=line-untyped]")
      .invoke("text")
      .then((text) => text.trim())
      .should("equal", "بسم الله الرحمن الرحيم");
    cy.get("[data-cy=line]").should("have.length.greaterThan", 1);
  });

  it("does not open a basmala-less surah with one", () => {
    visitRecite(9);
    cy.get("[data-cy=line]")
      .first()
      .find("[data-cy=line-untyped]")
      .invoke("text")
      .should("not.contain", "الرحمن الرحيم");
  });

  it("shows ayah endings that are marked but never typed", () => {
    visitRecite(112);
    cy.get("[data-cy=ayah-mark]").should("have.length", 4);
    cy.get("[data-cy=ayah-mark]").first().should("have.attr", "data-ayah", "1");
    cy.get("[data-cy=ayah-mark]").first().should("contain.text", "۝");
    cy.get("[data-cy=ayah-mark]").last().should("contain.text", "٤");

    cy.targetText().should((text) => {
      expect(text, "the end-of-ayah sign is never typed").to.not.contain("۝");
      expect(text, "no Arabic-Indic digits are ever typed").to.not.match(/[٠-٩]/);
    });

    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
  });

  it("cuts the rendered text only at ayah boundaries, which are spaces", () => {
    visitRecite(2);
    cy.get("[data-seg-start]").each(($span) => {
      const node = $span[0] as HTMLElement;
      expect(node.childNodes.length, "a text run must be a single text node").to.equal(1);
    });
    cy.get("[data-cy=line]").each(($line) => {
      const runs = [...($line[0] as HTMLElement).querySelectorAll("[data-seg-start]")];
      runs.slice(1).forEach((run) => {
        expect((run.textContent ?? "").startsWith(" "), "a cut never falls inside a word").to.equal(true);
      });
    });
  });

  it("puts no ayah marks on an adaptive lesson", () => {
    visitWith({ settings: { mode: "adaptive", tierOverride: "none" } });
    cy.get("[data-cy=typing-area]").should("exist");
    cy.get("[data-cy=ayah-mark]").should("not.exist");
  });
  it("renders as many ayat as the setting asks for", () => {
    stubRecitation();
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 2 } });
    cy.get("[data-cy=ayah-mark]").should("have.length", 2);
    cy.get("[data-cy=attribution]").should("contain.text", "2:1–2");

    cy.openRecitationSettings();
    cy.get("[data-cy=setting-ayat]").should("have.value", "2").select("6 ayat");
    cy.closeRecitationSettings();

    cy.get("[data-cy=ayah-mark]").should("have.length", 6);
    cy.get("[data-cy=ayah-mark]").last().should("have.attr", "data-ayah", "6");
    cy.get("[data-cy=attribution]").should("contain.text", "2:1–6");
  });

  it("never runs past the end of a short surah", () => {
    stubRecitation();
    visitWith({ surah: 112, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 20 } });
    cy.get("[data-cy=ayah-mark]").should("have.length", 4);
    cy.get("[data-cy=attribution]").should("contain.text", "112:1–4");
  });

  it("offers one ayah at a time for drilling a single line", () => {
    stubRecitation();
    visitWith({ surah: 2, settings: { mode: "recite", tierOverride: "none", ayatPerLesson: 1 } });
    cy.get("[data-cy=ayah-mark]").should("have.length", 1);
    cy.get("[data-cy=setting-ayat]").should("not.be.visible");
    cy.openRecitationSettings();
    cy.get("[data-cy=setting-ayat]").should("contain.text", "1 ayah");
    cy.closeRecitationSettings();
    cy.typeTarget();
    cy.get("[data-cy=completion]").should("be.visible");
    cy.get("[data-cy=summary-errors]").should("have.text", "0");
  });
});
