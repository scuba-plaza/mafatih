import { isHaraka, type KeyCap, LAYOUT_NAME, strokeFor, WIN101_CAPS } from "~/engine/layout/ara.ts";
import { type Digit, fingerName, fingerOf, HOME_KEYS, sameFinger } from "~/engine/layout/fingers.ts";

export interface VirtualKeyboardProps {
  nextChar?: string;
  shiftHeld?: boolean;
  fingers?: boolean;
}

const KEY_REM = 2.5;
const GAP_REM = 0.25;
const UNIT_REM = KEY_REM + GAP_REM;

const ROW_INDENT_UNITS = [0, 1.5, 1.75, 0];
const SHIFT_UNITS = 2.25;
const SPACE_INDENT_UNITS = 3.75;
const SPACE_UNITS = 6.25;

function units(count: number): string {
  return `${count * UNIT_REM}rem`;
}

function span(count: number): string {
  return `${count * UNIT_REM - GAP_REM}rem`;
}

const KEY = "relative flex h-10 w-10 flex-col items-center justify-center rounded-md text-center transition-colors";
const IDLE_TEXT = "text-stone-600 dark:text-stone-400";
const IDLE_FILL = "bg-stone-100 dark:bg-stone-900";
const IDLE = `${IDLE_FILL} ${IDLE_TEXT}`;
const TARGET = "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/40 dark:text-sky-300";

const ZONE_FILL: Record<Digit, string> = {
  pinky: "bg-rose-100/70 dark:bg-rose-400/10",
  ring: "bg-amber-100/70 dark:bg-amber-400/10",
  middle: "bg-emerald-100/70 dark:bg-emerald-400/10",
  index: "bg-violet-100/70 dark:bg-violet-400/10",
  thumb: IDLE_FILL,
};

const ZONE_EDGE =
  "pointer-events-none absolute inset-y-1.5 -left-[0.1875rem] w-px bg-stone-400/60 dark:bg-stone-500/60";
const HOME_MARK = "pointer-events-none absolute bottom-0.5 h-0.5 w-3 rounded-full bg-current opacity-50";

function keyClass(code: string, isTarget: boolean, fingers: boolean): string {
  if (isTarget) {
    return TARGET;
  }
  if (!fingers) {
    return IDLE;
  }
  const finger = fingerOf(code);
  return `${finger === undefined ? IDLE_FILL : ZONE_FILL[finger.digit]} ${IDLE_TEXT}`;
}

function keycapLabel(cap: KeyCap): { base: string; shift: string } {
  const base = cap.base === " " ? "" : cap.base;
  const shift = cap.shift === cap.base || cap.shift === " " ? "" : cap.shift;
  return { base, shift };
}

export default function VirtualKeyboard({ nextChar, shiftHeld = false, fingers = true }: VirtualKeyboardProps) {
  const caps = WIN101_CAPS;
  const target = nextChar === undefined ? undefined : strokeFor(nextChar);
  const needsShift = target?.shift === true;
  const rows = ROW_INDENT_UNITS.map((_, row) => caps.filter((cap) => cap.row === row));
  const space = caps.find((cap) => cap.code === "Space");
  const spaceIsTarget = target?.code === "Space";

  return (
    <div
      data-cy="virtual-keyboard"
      title={`${LAYOUT_NAME} keyboard`}
      data-next-code={target?.code ?? ""}
      data-fingers={fingers ? "true" : "false"}
      className="select-none"
      dir="ltr"
    >
      <div className="flex flex-col items-start gap-1">
        {rows.map((row, index) => (
          <div
            key={index}
            data-cy="keyboard-row"
            className="flex gap-1"
            style={{ marginLeft: units(ROW_INDENT_UNITS[index] ?? 0) }}
          >
            {index === 3 ? <ShiftKey active={needsShift} held={shiftHeld} /> : null}
            {row.map((cap, position) => {
              const label = keycapLabel(cap);
              const isTarget = target?.code === cap.code;
              const finger = fingerOf(cap.code);
              const previous = row[position - 1];
              const edge = fingers && previous !== undefined && !sameFinger(fingerOf(previous.code), finger);
              const home = fingers && HOME_KEYS.has(cap.code);
              return (
                <div
                  key={cap.code}
                  data-cy="keycap"
                  data-code={cap.code}
                  data-target={isTarget ? "true" : "false"}
                  data-finger={fingers && finger !== undefined ? `${finger.hand}-${finger.digit}` : undefined}
                  data-home={home ? "true" : undefined}
                  title={fingers && finger !== undefined ? fingerName(finger) : undefined}
                  className={`${KEY} ${keyClass(cap.code, isTarget, fingers)}`}
                >
                  {edge ? <span data-cy="finger-edge" aria-hidden="true" className={ZONE_EDGE} /> : null}
                  {home ? <span data-cy="home-mark" aria-hidden="true" className={HOME_MARK} /> : null}
                  <span
                    lang="ar"
                    className={`text-[0.65rem] leading-none ${
                      isTarget && needsShift ? "font-semibold text-sky-600 dark:text-sky-300" : "text-stone-400/80"
                    } ${isHaraka(cap.shift) ? "px-1" : ""}`}
                  >
                    {label.shift}
                  </span>
                  <span lang="ar" className="font-arabic text-base leading-tight">
                    {label.base}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        {space ? (
          <div
            data-cy="keycap"
            data-code="Space"
            data-target={spaceIsTarget ? "true" : "false"}
            data-finger={fingers ? "both-thumb" : undefined}
            title={fingers ? "Either thumb" : undefined}
            className={`h-8 rounded-md ${spaceIsTarget ? TARGET : IDLE}`}
            style={{ marginLeft: units(SPACE_INDENT_UNITS), width: span(SPACE_UNITS) }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ShiftKey({ active, held }: { active: boolean; held: boolean }) {
  return (
    <div
      data-cy="shift-key"
      data-active={active ? "true" : "false"}
      data-held={held ? "true" : "false"}
      style={{ width: span(SHIFT_UNITS) }}
      className={`flex h-10 items-center justify-center rounded-md text-[0.6rem] font-semibold uppercase tracking-wider transition-colors ${
        active || held ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : `${IDLE} text-stone-400`
      }`}
    >
      Shift
    </div>
  );
}
