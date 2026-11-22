import type { RefObject } from "react";
import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { type Language, translate } from "~/i18n/i18n.ts";
import { carriedMark } from "~/text/arabic.ts";
import { expectedText, type Session, type SessionOptions } from "~/typing/session.ts";
import type { Finger } from "./fingers.ts";
import { type Guide, guideFor } from "./guide.ts";
import { HINT_DELAY_MS } from "./hint.ts";
import { type KeyCap, WIN101_CAPS } from "./layout101.ts";
import { useLayoutName } from "./useLayoutName.ts";
import { useRevealAfter } from "./useRevealAfter.ts";

interface Slot {
  readonly code: string;
  readonly units: number;
  readonly cap?: KeyCap;
  readonly symbol?: string;
  readonly layout?: true;
}

interface Row {
  readonly lead: number;
  readonly slots: readonly Slot[];
}

const KEY_PX = 44;
const KEY_GAP_PX = 4;
const KEY_FACE_PX = 36;
const BACKSPACE_SYMBOL = "⌫";
const SHIFT_SYMBOL = "⇧";
const ENTER_SYMBOL = "↵";
const SPACE_UNITS = 6;
const ROW_UNITS = 15;
const WIDE_KEYS: Readonly<Record<string, number>> = { Backslash: 1.5 };
const HINT_ROW_PX = 36;
export const GUIDE_QUERY = "(min-width: 48rem) and (pointer: fine)";
const NOTHING_DUE: Guide = { keys: new Set(), shifted: false, finger: undefined };

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
  { lead: (ROW_UNITS - SPACE_UNITS) / 2, slots: [{ code: "Space", units: SPACE_UNITS, layout: true }] },
];

export function guideHeight(fingerGuide: boolean): number {
  return ROWS.length * (KEY_FACE_PX + KEY_GAP_PX) + (fingerGuide ? HINT_ROW_PX : 0);
}

function legendOf(slot: Slot, shifted: boolean, layoutName: string, labelled: boolean): string {
  if (slot.layout === true) {
    return layoutName;
  }
  if (slot.symbol !== undefined) {
    return slot.symbol;
  }
  if (!labelled) {
    return "";
  }
  return carriedMark((shifted ? slot.cap?.shift : slot.cap?.base) ?? "");
}

function captionOf(finger: MessageKey | undefined, shifted: boolean, language: Language): string {
  if (finger === undefined) {
    return "";
  }
  const name = translate(language, finger);
  return shifted ? translate(language, "guide.withShift", { finger: name }) : name;
}

function fingerName(finger: Finger | undefined): MessageKey | undefined {
  return finger === undefined ? undefined : FINGER_MESSAGES[`${finger.hand}-${finger.digit}`];
}

export interface GuideKeyboardProps {
  readonly session: Session;
  readonly options: SessionOptions;
  readonly fingerGuide: boolean;
  readonly keyLabels: boolean;
  readonly delayedHint: boolean;
  readonly paused: boolean;
  readonly hidden: boolean;
  readonly ref?: RefObject<HTMLDivElement | null>;
}

export function GuideKeyboard({
  session,
  options,
  fingerGuide,
  keyLabels,
  delayedHint,
  paused,
  hidden,
  ref,
}: GuideKeyboardProps) {
  const { language } = useI18n();
  const deleting = options.requireBackspace && session.mistakes.length > 0;
  const revealed = useRevealAfter(
    `${session.cursor}:${session.within}:${paused}`,
    delayedHint ? HINT_DELAY_MS : 0,
    session.missed || session.mistakes.length > 0,
  );
  const guide = revealed && !paused ? guideFor(expectedText(session), deleting) : NOTHING_DUE;
  const layoutName = useLayoutName();
  const caption = captionOf(fingerName(guide.finger), guide.shifted, language);

  return (
    <div
      ref={ref}
      hidden={hidden}
      aria-hidden="true"
      dir="ltr"
      data-guide-keyboard=""
      className="mx-auto mt-[clamp(1.25rem,calc(5dvh-0.75rem),2.75rem)] flex w-[660px] max-w-full select-none flex-col"
    >
      {ROWS.map((row) => (
        <div key={row.slots[0]?.code} className="flex" style={{ paddingLeft: row.lead * KEY_PX }}>
          {row.slots.map((slot) => (
            <div
              key={slot.code}
              lang={slot.layout === true ? undefined : "ar"}
              data-key={slot.code}
              data-due={guide.keys.has(slot.code) ? "" : undefined}
              className={`flex shrink-0 items-center justify-center rounded-md border border-line leading-none text-muted data-due:halo data-due:font-bold ${slot.layout === true ? "text-sm" : "text-lg"}`}
              style={{ width: slot.units * KEY_PX - KEY_GAP_PX, height: KEY_FACE_PX, margin: KEY_GAP_PX / 2 }}
            >
              {legendOf(slot, guide.shifted, layoutName, keyLabels || guide.keys.has(slot.code))}
            </div>
          ))}
        </div>
      ))}
      {fingerGuide && <p className="mt-3 h-6 text-center text-sm text-muted">{caption}</p>}
    </div>
  );
}
