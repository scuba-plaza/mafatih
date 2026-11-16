import { expect, test } from "vitest";
import { isMacPlatform, platformOf } from "./platform.ts";

test("a Mac reports MacIntel, macOS or an older Mac name", () => {
  for (const platform of ["MacIntel", "macOS", "MacPPC", "Mac68K"]) {
    expect(isMacPlatform(platform), platform).toBe(true);
  }
});

test("every other system is not a Mac", () => {
  for (const platform of ["Win32", "Windows", "Linux x86_64", "Linux", "Android", "iPhone", "iPad", "ChromeOS", ""]) {
    expect(isMacPlatform(platform), platform).toBe(false);
  }
});

test("the client hints platform wins over the legacy platform string", () => {
  const modern = { platform: "MacIntel", userAgentData: { platform: "Windows" } };
  expect(platformOf(modern)).toBe("Windows");
});

test("without usable client hints the legacy platform string is used", () => {
  const unusable = [
    { platform: "Win32" },
    { platform: "Win32", userAgentData: {} },
    { platform: "Win32", userAgentData: { platform: "" } },
    { platform: "Win32", userAgentData: { platform: 7 } },
    { platform: "Win32", userAgentData: null },
  ];
  for (const source of unusable) {
    expect(platformOf(source), JSON.stringify(source)).toBe("Win32");
  }
});
