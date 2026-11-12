import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { isMark } from "~/text/arabic.ts";
import { expectedText, type Session, type SessionOptions } from "~/typing/session.ts";
import { type Digit, type Finger, fingerOf } from "./fingers.ts";
import { guideFor } from "./guide.ts";
import { type KeyCap, WIN101_CAPS } from "./layout101.ts";

interface Slot {
  readonly code: string;
  readonly units: number;
  readonly cap?: KeyCap;
  readonly symbol?: string;
}

interface Row {
  readonly lead: number;
  readonly slots: readonly Slot[];
}

const KEY_PX = 44;
const KEY_GAP_PX = 4;
const KEY_FACE_PX = KEY_PX - KEY_GAP_PX;
const TATWEEL = String.fromCodePoint(0x640);
const BACKSPACE_SYMBOL = "⌫";
const SHIFT_SYMBOL = "⇧";
const ENTER_SYMBOL = "↵";
const SPACE_UNITS = 6;
const ROW_UNITS = 15;
const WIDE_KEYS: Readonly<Record<string, number>> = { Backslash: 1.5 };

const FINGER_MESSAGES: Readonly<Record<string, MessageKey>> = {
  "left-pinky": "finger.leftPinky",
  "left-ring": "finger.leftRing",
  "left-middle": "finger.leftMiddle",
  "left-index": "finger.leftIndex",
  "right-index": "finger.rightIndex",
  "right-middle": "finger.rightMiddle",
  "right-ring": "finger.rightRing",
  "right-pinky": "finger.rightPinky",
  "both-thumb": "finger.thumb",
};

const FIXED_DIGITS: Readonly<Record<string, Digit>> = { Backspace: "pinky", ShiftLeft: "pinky", ShiftRight: "pinky" };

const TINTS: Readonly<Record<Digit, string>> = {
  pinky: "bg-finger-pinky",
  ring: "bg-finger-ring",
  middle: "bg-finger-middle",
  index: "bg-finger-index",
  thumb: "bg-surface",
};

function capsOf(row: number): Slot[] {
  return WIN101_CAPS.filter((cap) => cap.row === row).map((cap) => ({
    code: cap.code,
    units: WIDE_KEYS[cap.code] ?? 1,
    cap,
  }));
}

const ROWS: readonly Row[] = [
  { lead: 0, slots: [...capsOf(0), { code: "Backspace", units: 2, symbol: BACKSPACE_SYMBOL }] },
  { lead: 1.5, slots: capsOf(1) },
  { lead: 1.75, slots: [...capsOf(2), { code: "Enter", units: 2.25, symbol: ENTER_SYMBOL }] },
  {
    lead: 0,
    slots: [
      { code: "ShiftLeft", units: 2.25, symbol: SHIFT_SYMBOL },
      ...capsOf(3),
      { code: "ShiftRight", units: 2.75, symbol: SHIFT_SYMBOL },
    ],
  },
  { lead: (ROW_UNITS - SPACE_UNITS) / 2, slots: [{ code: "Space", units: SPACE_UNITS, symbol: "" }] },
];

function legendOf(slot: Slot, shifted: boolean): string {
  if (slot.symbol !== undefined) {
    return slot.symbol;
  }
  const legend = shifted ? (slot.cap?.shift ?? "") : (slot.cap?.base ?? "");
  return isMark(legend) ? `${TATWEEL}${legend}` : legend;
}

function fingerName(finger: Finger | undefined): MessageKey | undefined {
  return finger === undefined ? undefined : FINGER_MESSAGES[`${finger.hand}-${finger.digit}`];
}

export interface GuideKeyboardProps {
  readonly session: Session;
  readonly options: SessionOptions;
  readonly fingerGuide: boolean;
}

export function GuideKeyboard({ session, options, fingerGuide }: GuideKeyboardProps) {
  const { t } = useI18n();
  const deleting = options.requireBackspace && session.mistakes.length > 0;
  const guide = guideFor(expectedText(session), deleting);
  const name = fingerName(guide.finger);
  const caption = name === undefined ? "" : guide.shifted ? t("guide.withShift", { finger: t(name) }) : t(name);

  return (
    <div
      aria-hidden="true"
      dir="ltr"
      data-guide-keyboard=""
      className="mx-auto hidden w-[660px] max-w-full select-none flex-col md:pointer-fine:flex"
    >
      {ROWS.map((row) => (
        <div key={row.slots[0]?.code} className="flex" style={{ paddingLeft: row.lead * KEY_PX }}>
          {row.slots.map((slot) => {
            const digit = fingerGuide ? (fingerOf(slot.code)?.digit ?? FIXED_DIGITS[slot.code]) : undefined;
            return (
              <div
                key={slot.code}
                lang="ar"
                data-key={slot.code}
                data-due={guide.keys.has(slot.code) ? "" : undefined}
                className={`flex shrink-0 items-center justify-center rounded border border-line text-lg leading-none text-ink data-due:border-4 data-due:border-ink data-due:font-bold ${digit === undefined ? "bg-surface" : TINTS[digit]}`}
                style={{ width: slot.units * KEY_PX - KEY_GAP_PX, height: KEY_FACE_PX, margin: KEY_GAP_PX / 2 }}
              >
                {legendOf(slot, guide.shifted)}
              </div>
            );
          })}
        </div>
      ))}
      {fingerGuide && <p className="h-6 text-center text-sm text-muted">{caption}</p>}
    </div>
  );
}
