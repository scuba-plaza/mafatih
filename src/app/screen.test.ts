import { expect, test } from "vitest";
import { chromeFor, isApplePlatform, isPhoneScreen, keyboardReserve } from "./screen.ts";

test("a touch screen whose short side is under 600 CSS pixels is a phone, in either orientation", () => {
  expect(isPhoneScreen({ coarse: true, screenWidth: 412, screenHeight: 915 })).toBe(true);
  expect(isPhoneScreen({ coarse: true, screenWidth: 915, screenHeight: 412 })).toBe(true);
});

test("a tablet is not a phone", () => {
  expect(isPhoneScreen({ coarse: true, screenWidth: 820, screenHeight: 1180 })).toBe(false);
});

test("600 CSS pixels is the first size that is not a phone", () => {
  expect(isPhoneScreen({ coarse: true, screenWidth: 599, screenHeight: 900 })).toBe(true);
  expect(isPhoneScreen({ coarse: true, screenWidth: 600, screenHeight: 900 })).toBe(false);
});

test("a narrow window on a mouse-driven computer is not a phone", () => {
  expect(isPhoneScreen({ coarse: false, screenWidth: 390, screenHeight: 844 })).toBe(false);
});

test("a phone with the keyboard up collapses its header", () => {
  expect(chromeFor({ phone: true, keyboardUp: true, visibleHeight: 467 })).toBe("collapsed");
});

test("a phone with the keyboard up and under 320 pixels left shows only the text", () => {
  expect(chromeFor({ phone: true, keyboardUp: true, visibleHeight: 213 })).toBe("text-only");
  expect(chromeFor({ phone: true, keyboardUp: true, visibleHeight: 319 })).toBe("text-only");
  expect(chromeFor({ phone: true, keyboardUp: true, visibleHeight: 320 })).toBe("collapsed");
});

test("without a keyboard, or on something that is not a phone, nothing is collapsed", () => {
  expect(chromeFor({ phone: true, keyboardUp: false, visibleHeight: 213 })).toBe("full");
  expect(chromeFor({ phone: false, keyboardUp: true, visibleHeight: 213 })).toBe("full");
});

test("Apple platforms are recognised by their platform string", () => {
  expect(isApplePlatform("iPhone")).toBe(true);
  expect(isApplePlatform("iPad")).toBe(true);
  expect(isApplePlatform("MacIntel")).toBe(true);
  expect(isApplePlatform("Win32")).toBe(false);
  expect(isApplePlatform("Linux armv8l")).toBe(false);
});

test("only an Apple touch device with its keyboard up reserves room for the floating bar", () => {
  expect(keyboardReserve({ appleTouch: true, keyboardUp: true })).toBe(64);
  expect(keyboardReserve({ appleTouch: true, keyboardUp: false })).toBe(0);
  expect(keyboardReserve({ appleTouch: false, keyboardUp: true })).toBe(0);
  expect(keyboardReserve({ appleTouch: false, keyboardUp: false })).toBe(0);
});
