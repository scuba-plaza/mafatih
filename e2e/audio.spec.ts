import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { seedProfile } from "./helpers/profile.ts";
import { doneText, shownText, surface, typeKeys } from "./helpers/typing.ts";

const SHORT = readFileSync(new URL("./fixtures/ayah.mp3", import.meta.url));
const LONG = readFileSync(new URL("./fixtures/ayah-long.mp3", import.meta.url));
interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const MARKS = /[\u064B-\u0652\u0670]/g;
const MURATTAL = /^\P{L}*Abdul Basit \u02BFAbd us-Samad\P{L}* \u00B7 \P{L}*Murattal\P{L}* 64 kbps \u00B7 (\d+):(\d+)$/u;

interface Mocked {
  readonly requests: string[];
}

async function mockAudio(page: Page, clip: Buffer = SHORT): Promise<Mocked> {
  const requests: string[] = [];
  await page.route("https://everyayah.com/**", (route) => {
    requests.push(new URL(route.request().url()).pathname.split("/").at(-1) ?? "");
    return route.fulfill({
      body: clip,
      contentType: "audio/mpeg",
      headers: { "access-control-allow-origin": "*" },
    });
  });
  return { requests };
}

function lettersOf(shown: string): string[] {
  return [...shown.replace(MARKS, "").replace(/\u00A0\u06DD[\u0660-\u0669]+/g, "")];
}

interface AudioLog {
  readonly currentTime: number[];
  readonly volume: number[];
  readonly muted: boolean[];
  plays: number;
}

const SPY = `
  const log = { currentTime: [], volume: [], muted: [], plays: 0 };
  const audios = [];
  window.audioLog = log;
  window.audios = audios;
  const proto = HTMLMediaElement.prototype;
  for (const name of ["currentTime", "volume", "muted"]) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (descriptor && descriptor.set) {
      const original = descriptor.set;
      Object.defineProperty(proto, name, {
        get: descriptor.get,
        configurable: true,
        set(value) {
          log[name].push(value);
          original.call(this, value);
        },
      });
    }
  }
  const play = proto.play;
  proto.play = function () {
    log.plays += 1;
    return play.call(this);
  };
  const Original = window.Audio;
  const Spy = function (src) {
    const element = new Original(src);
    audios.push(element);
    return element;
  };
  Spy.prototype = Original.prototype;
  window.Audio = Spy;
`;

async function spyAudio(page: Page): Promise<void> {
  await page.addInitScript({ content: SPY });
}

async function firstAudio<Result>(page: Page, work: (audio: HTMLAudioElement) => Result): Promise<Result> {
  return page.evaluate(`(${work.toString()})(window.audios[0])`) as Promise<Result>;
}

async function readLog(page: Page): Promise<AudioLog> {
  return page.evaluate(() => (window as unknown as { audioLog: AudioLog }).audioLog);
}

function player(page: Page) {
  return page.getByRole("group", { name: "Recitation audio" });
}

function status(page: Page) {
  return player(page).getByRole("status");
}

async function playingSpan(page: Page): Promise<string[]> {
  return page.evaluate(() => [...(CSS.highlights.get("mafatih-playing") ?? [])].map((range) => range.toString()));
}

test("the controls have names, Play and Pause are one button whose name changes, Mute is a toggle", async ({
  page,
}) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await expect(player(page)).toBeVisible();
  const play = player(page).getByRole("button", { name: "Play", exact: true });
  await expect(play).not.toHaveAttribute("aria-pressed", /.*/);
  await expect(player(page).getByRole("button", { name: "Previous ayah" })).toBeVisible();
  await expect(player(page).getByRole("button", { name: "Next ayah" })).toBeVisible();
  await play.click();
  const pause = player(page).getByRole("button", { name: "Pause", exact: true });
  await expect(pause).toBeVisible();
  await expect(pause).not.toHaveAttribute("aria-pressed", /.*/);
  const mute = player(page).getByRole("button", { name: "Mute", exact: true });
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  const volume = player(page).getByRole("slider", { name: "Volume" });
  await expect(volume).toHaveAttribute("aria-valuetext", "80%");
  await volume.press("Home");
  await expect(volume).toHaveAttribute("aria-valuetext", "0%");
  const whole = player(page).getByRole("switch", { name: "Play whole passage" });
  await expect(whole).not.toBeChecked();
  await whole.check();
  await expect(whole).toBeChecked();
  await expectNoAxeViolations(page);
});

test("the status line names the reciter and the ayah, politely, and changes per ayah only", async ({ page }) => {
  await mockAudio(page, LONG);
  await seedProfile(page, { settings: { playWhole: true } });
  await page.goto("/#/recitation/1/1");
  await expect(status(page)).toHaveText(MURATTAL);
  await expect(status(page)).toContainText("1:1");
  await player(page).getByRole("button", { name: "Next ayah" }).click();
  await expect(status(page)).toContainText("1:2");
  await player(page).getByRole("button", { name: "Previous ayah" }).click();
  await expect(status(page)).toContainText("1:1");
});

test("a passage that opens a surah starts with the basmala clip, then the ayat", async ({ page }) => {
  const { requests } = await mockAudio(page, LONG);
  await page.goto("/#/recitation/112/1");
  await expect(status(page)).toContainText("Basmala");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => requests).toContain("001001.mp3");
  await player(page).getByRole("button", { name: "Next ayah" }).click();
  await expect(status(page)).toContainText("112:1");
});

test("the ayah being recited is marked in the text by colour and by background, and nothing else changes", async ({
  page,
}) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  const before = await shownText(page);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => playingSpan(page)).toHaveLength(1);
  const [spoken] = await playingSpan(page);
  expect(spoken?.replace(MARKS, "")).toBe(before.split(" ")[0]?.replace(MARKS, ""));
  const colours = await surface(page)
    .locator("[data-block]")
    .first()
    .evaluate((block) => {
      const style = getComputedStyle(block, "::highlight(mafatih-playing)");
      return { colour: style.color, background: style.backgroundColor, underline: style.textDecorationLine };
    });
  expect(colours.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(colours.underline).toContain("underline");
  expect(await shownText(page)).toBe(before);
  await player(page).getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => playingSpan(page)).toHaveLength(0);
});

test("each ayah is fetched once: after a reload only the saved copy can supply it", async ({ page }) => {
  const { requests } = await mockAudio(page, SHORT);
  const count = (file: string) => requests.filter((name) => name === file).length;
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => count("001001.mp3")).toBe(1);
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.reload();
  await expect(player(page)).toBeVisible();
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(count("001001.mp3")).toBe(1);
});

test("the next ayah is fetched ahead while one plays, and not before anything plays", async ({ page }) => {
  const { requests } = await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await expect(player(page)).toBeVisible();
  await page.waitForTimeout(400);
  expect(requests).toEqual([]);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => requests).toEqual(expect.arrayContaining(["001001.mp3", "001002.mp3"]));
  expect(requests.filter((name) => name === "001001.mp3")).toHaveLength(1);
});

test("with the whole passage on, each clip that ends is followed by the next, each fetched once, and then it stops", async ({
  page,
}) => {
  const { requests } = await mockAudio(page, SHORT);
  await seedProfile(page, { settings: { playWhole: true } });
  await page.goto("/#/recitation/1/1");
  await status(page).evaluate((element) => {
    const heard: string[] = [];
    Object.assign(window, { heard });
    new MutationObserver(() => heard.push(element.textContent ?? "")).observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { heard: string[] }).heard.length))
    .toBeGreaterThan(2);
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const heard = await page.evaluate(() => (window as unknown as { heard: string[] }).heard);
  const ayat = heard.map((text) => /(\d+):(\d+)$/.exec(text)?.[2]).filter((ayah) => ayah !== undefined);
  expect(ayat).toEqual(expect.arrayContaining(["2", "3", "4"]));
  expect(ayat.indexOf("2")).toBeLessThan(ayat.indexOf("3"));
  expect(ayat.indexOf("3")).toBeLessThan(ayat.indexOf("4"));
  for (const file of ["001001.mp3", "001002.mp3", "001003.mp3", "001004.mp3"]) {
    expect(
      requests.filter((name) => name === file),
      file,
    ).toHaveLength(1);
  }
});

test("Previous restarts a clip that has played for more than two seconds, and steps back before that", async ({
  page,
}) => {
  await spyAudio(page);
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect.poll(() => firstAudio(page, (audio) => audio.src)).not.toBe("");
  const firstClip = await firstAudio(page, (audio) => audio.src);
  await player(page).getByRole("button", { name: "Next ayah" }).click();
  await expect(status(page)).toContainText("1:2");
  await expect
    .poll(() =>
      page.evaluate((previous) => {
        const audio = (window as unknown as { audios: HTMLAudioElement[] }).audios[0];
        return audio !== undefined && audio.src !== previous && audio.readyState >= 1;
      }, firstClip),
    )
    .toBe(true);
  await firstAudio(page, (audio) => {
    audio.currentTime = 3;
  });
  const before = (await readLog(page)).currentTime.length;
  await player(page).getByRole("button", { name: "Previous ayah" }).click();
  await expect.poll(async () => (await readLog(page)).currentTime.length).toBeGreaterThan(before);
  expect((await readLog(page)).currentTime.at(-1)).toBe(0);
  await expect(status(page)).toContainText("1:2");
  await firstAudio(page, (audio) => {
    audio.currentTime = 1;
  });
  await player(page).getByRole("button", { name: "Previous ayah" }).click();
  await expect(status(page)).toContainText("1:1");
});

test("Previous on the first clip rewinds it once; pausing and playing afterwards does not rewind again", async ({
  page,
}) => {
  await spyAudio(page);
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await player(page).getByRole("button", { name: "Previous ayah" }).click();
  await expect.poll(async () => (await readLog(page)).currentTime).toEqual([0]);
  await player(page).getByRole("button", { name: "Pause", exact: true }).click();
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  expect((await readLog(page)).currentTime).toEqual([0]);
});

test("the volume and the mute setting reach the audio itself", async ({ page }) => {
  await spyAudio(page);
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("slider", { name: "Volume" }).press("Home");
  await expect.poll(async () => (await readLog(page)).volume.at(-1)).toBe(0);
  await player(page).getByRole("button", { name: "Mute", exact: true }).click();
  await expect.poll(async () => (await readLog(page)).muted.at(-1)).toBe(true);
});

test("an error from the audio element is said plainly", async ({ page }) => {
  await spyAudio(page);
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await firstAudio(page, (audio) => {
    audio.dispatchEvent(new Event("error"));
  });
  await expect(status(page)).toHaveText("Recitation unavailable");
});

test("when the passage is finished Play still plays: the pause was only a rest", async ({ page }) => {
  await spyAudio(page);
  await mockAudio(page, LONG);
  await seedProfile(page, { settings: { vocalization: "letters" } });
  await page.goto("/#/recitation/112/1");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(await shownText(page)));
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  const before = (await readLog(page)).plays;
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect.poll(async () => (await readLog(page)).plays).toBeGreaterThan(before);
});

test("a mouse click on the switch or the slider gives the typing field its focus back", async ({ page, isMobile }) => {
  test.skip(isMobile, "a touch screen keeps its keyboard closed");
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  const field = page.getByRole("textbox", { name: "Type the text shown" });
  await player(page).getByRole("switch", { name: "Play whole passage" }).click();
  await expect(field).toBeFocused();
  await expect(player(page).getByRole("switch", { name: "Play whole passage" })).toBeChecked();
  await player(page).getByRole("slider", { name: "Volume" }).focus();
  await expect(field).not.toBeFocused();
  await player(page).getByRole("slider", { name: "Volume" }).click();
  await expect(field).toBeFocused();
});

test("typing never starts audio, and audio never moves the cursor (Q5)", async ({ page }) => {
  const { requests } = await mockAudio(page, LONG);
  await seedProfile(page, { settings: { vocalization: "letters" } });
  await page.goto("/#/recitation/112/1");
  await page.getByRole("button", { name: "Start typing" }).click();
  const keys = lettersOf(await shownText(page)).slice(0, 12);
  await typeKeys(page, keys.slice(0, 6));
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
  const typed = await doneText(page);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(await doneText(page)).toBe(typed);
  await typeKeys(page, keys.slice(6, 9));
  expect((await doneText(page)).length).toBeGreaterThan(typed.length);
});

test("a recitation that cannot be fetched is said plainly and the lesson stays typeable (Q6)", async ({ page }) => {
  await page.route("https://everyayah.com/**", (route) => route.abort());
  await seedProfile(page, { settings: { vocalization: "letters" } });
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(status(page)).toHaveText("Recitation unavailable");
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Type the text shown" }).focus();
  await typeKeys(page, [..."بسم"]);
  expect((await doneText(page)).length).toBeGreaterThan(0);
  await expectNoAxeViolations(page);
});

test("Settings shows how much is saved and Delete empties it", async ({ page }) => {
  await mockAudio(page, SHORT);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const group = dialog.getByRole("group", { name: "Recitation audio" });
  await expect(group.getByText(/^Saved recitations: [1-9]\d* \(\P{L}*[\d.]+ kB\P{L}*\)$/u)).toBeVisible();
  await group.getByRole("button", { name: "Delete saved recitations" }).click();
  await expect(group.getByText(/^Saved recitations: 0 \(\P{L}*0 kB\P{L}*\)$/u)).toBeVisible();
  await expect(group.getByRole("status")).toHaveText("Saved recitations were deleted.");
});

test("the reciter is chosen in Settings and the next recitation comes from that reciter", async ({ page }) => {
  const { requests } = await mockAudio(page, SHORT);
  const folders: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://everyayah.com/")) {
      folders.push(request.url().split("/")[4] ?? "");
    }
  });
  await page.goto("/#/recitation/1/1");
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const reciters = dialog.getByRole("group", { name: "Recitation audio" }).getByRole("group", { name: "Reciter" });
  await expect(reciters.getByRole("radio", { name: "Murattal", exact: true })).toBeChecked();
  await reciters.getByRole("radio", { name: "Mujawwad", exact: true }).check();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(status(page)).toContainText("Mujawwad");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  expect(folders[0]).toBe("Abdul_Basit_Mujawwad_128kbps");
});

test("after a mouse click on a control the typing field has the focus again; a keyboard press leaves it on the control", async ({
  page,
  isMobile,
}) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  const field = page.getByRole("textbox", { name: "Type the text shown" });
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  if (isMobile) {
    await expect(field).not.toBeFocused();
  } else {
    await expect(field).toBeFocused();
  }
  const mute = player(page).getByRole("button", { name: "Mute", exact: true });
  await mute.focus();
  await page.keyboard.press("Enter");
  await expect(mute).toBeFocused();
});

test("the browser's media controls are told what is playing", async ({ page }) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  const metadata = await page.evaluate(() => ({
    title: navigator.mediaSession.metadata?.title ?? "",
    artist: navigator.mediaSession.metadata?.artist ?? "",
  }));
  expect(metadata.artist).toBe("Abdul Basit ʿAbd us-Samad");
  expect(metadata.title).toContain("Al-Faatiha");
});

test("on the basmala clip the media controls say Basmala, and in Arabic the reciter is named in Arabic", async ({
  page,
}) => {
  await mockAudio(page, LONG);
  await seedProfile(page, { settings: { language: "ar" } });
  await page.goto("/#/recitation/112/1");
  const arabic = page.getByRole("group", { name: "التلاوة الصوتية" });
  await arabic.getByRole("button", { name: "تشغيل", exact: true }).click();
  await expect(arabic.getByRole("button", { name: "إيقاف مؤقت", exact: true })).toBeVisible();
  const metadata = await page.evaluate(() => ({
    title: navigator.mediaSession.metadata?.title ?? "",
    artist: navigator.mediaSession.metadata?.artist ?? "",
  }));
  expect(metadata.title).toBe("البسملة");
  expect(metadata.artist).toBe("عبد الباسط عبد الصمد");
});

async function playButtonLabel(page: Page): Promise<string> {
  return page.evaluate(() => {
    const group = [...document.querySelectorAll("fieldset")].find(
      (element) =>
        element.closest("dialog") === null && element.querySelector("legend")?.textContent === "Recitation audio",
    );
    return group?.querySelector("button.bg-accent .sr-only")?.textContent ?? "";
  });
}

test("the audio pauses while a dialog is open and goes on when it closes", async ({ page }) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect.poll(() => playButtonLabel(page)).toBe("Play");
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done" }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect.poll(() => playButtonLabel(page)).toBe("Play");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("a recitation paused by the user stays paused when a dialog closes", async ({ page }) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await player(page).getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done" }).click();
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("finishing a passage pauses the audio, and Next passage carries it on into the next passage", async ({ page }) => {
  await spyAudio(page);
  await mockAudio(page, LONG);
  await seedProfile(page, { settings: { vocalization: "letters", playWhole: true } });
  await page.goto("/#/recitation/112/1");
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Type the text shown" }).focus();
  await typeKeys(page, lettersOf(await shownText(page)));
  const summary = page.getByRole("heading", { level: 2 }).locator("xpath=..");
  await expect(summary).toBeVisible();
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await summary.getByRole("button", { name: /^(Next surah|Next passage|Start again)$/ }).click();
  await expect(page).toHaveURL(/#\/recitation\/113\/1$/);
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(status(page)).toContainText("Basmala");
  expect((await readLog(page)).currentTime.at(-1)).toBe(0);
});

test("in the Arabic interface the audio is named in Arabic and its transport keeps its left-to-right order", async ({
  page,
}) => {
  await mockAudio(page, LONG);
  await seedProfile(page, { settings: { language: "ar" } });
  await page.goto("/#/recitation/1/1");
  const arabic = page.getByRole("group", { name: "التلاوة الصوتية" });
  await expect(arabic.getByRole("status")).toContainText("عبد الباسط عبد الصمد");
  const boxes = await Promise.all(
    ["الآية السابقة", "تشغيل", "الآية التالية"].map((name) =>
      arabic.getByRole("button", { name, exact: true }).boundingBox(),
    ),
  );
  expect(boxes[0]?.x).toBeLessThan(boxes[1]?.x ?? 0);
  expect(boxes[1]?.x).toBeLessThan(boxes[2]?.x ?? 0);
  await expectNoAxeViolations(page);
});

function luminance({ red, green, blue }: Rgb): number {
  const [r, g, b] = [red, green, blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(first: Rgb, second: Rgb): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

for (const scheme of ["dark"] as const) {
  test(`the play button's icon can be told from its background (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await mockAudio(page, LONG);
    await page.goto("/#/recitation/1/1");
    const play = player(page).getByRole("button", { name: "Play", exact: true });
    const colours = await play.evaluate((button) => {
      const parse = (text: string): Rgb => {
        const [red = 0, green = 0, blue = 0] = (text.match(/[\d.]+/g) ?? []).map(Number);
        return { red, green, blue };
      };
      return {
        background: parse(getComputedStyle(button).backgroundColor),
        icon: parse(getComputedStyle(button.querySelector("svg") ?? button).color),
      };
    });
    expect(contrast(colours.background, colours.icon)).toBeGreaterThanOrEqual(4.5);
  });
}
