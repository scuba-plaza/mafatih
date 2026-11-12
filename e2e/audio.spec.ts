import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { seedProfile } from "./helpers/profile.ts";
import { doneText, shownText, surface, typeKeys } from "./helpers/typing.ts";

const SHORT = readFileSync(new URL("./fixtures/ayah.mp3", import.meta.url));
const LONG = readFileSync(new URL("./fixtures/ayah-long.mp3", import.meta.url));
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
      return { colour: style.color, background: style.backgroundColor };
    });
  expect(colours.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(await shownText(page)).toBe(before);
  await player(page).getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => playingSpan(page)).toHaveLength(0);
});

test("each ayah is fetched once: a second play comes from the saved copy", async ({ page }) => {
  const { requests } = await mockAudio(page, SHORT);
  await page.goto("/#/recitation/1/1");
  const play = player(page).getByRole("button", { name: "Play", exact: true });
  await play.click();
  await expect.poll(() => requests.filter((name) => name === "001001.mp3").length).toBe(1);
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(400);
  expect(requests.filter((name) => name === "001001.mp3")).toHaveLength(1);
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

test("the play button is drawn: its colour is not the colour of its icon", async ({ page }) => {
  await mockAudio(page, LONG);
  await page.goto("/#/recitation/1/1");
  const play = player(page).getByRole("button", { name: "Play", exact: true });
  const colours = await play.evaluate((button) => ({
    background: getComputedStyle(button).backgroundColor,
    icon: getComputedStyle(button.querySelector("svg") ?? button).color,
  }));
  expect(colours.background).not.toBe(colours.icon);
});
