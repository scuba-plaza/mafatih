import { expect, test } from "vitest";
import { chromeFor, isApplePlatform, isPhoneScreen, keyboardReserve } from "./screen.ts";

test.each([
  ["a phone held upright", true, 412, 915, true],
  ["a phone held sideways", true, 915, 412, true],
  ["a touch screen just under 600 CSS pixels", true, 599, 900, true],
  ["a touch screen of exactly 600 CSS pixels", true, 600, 900, false],
  ["a tablet", true, 820, 1180, false],
  ["a narrow window on a mouse-driven computer", false, 390, 844, false],
])("%s (coarse %s, %sx%s) is a phone: %s", (_, coarse, screenWidth, screenHeight, phone) => {
  expect(isPhoneScreen({ coarse, screenWidth, screenHeight })).toBe(phone);
});

test.each([
  [true, true, 467, "collapsed"],
  [true, true, 320, "collapsed"],
  [true, true, 319, "text-only"],
  [true, true, 213, "text-only"],
  [true, false, 213, "full"],
  [false, true, 213, "full"],
] as const)(
  "phone %s, keyboard up %s, %s pixels visible: the chrome is %s",
  (phone, keyboardUp, visibleHeight, chrome) => {
    expect(chromeFor({ phone, keyboardUp, visibleHeight })).toBe(chrome);
  },
);

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
