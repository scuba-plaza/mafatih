import { capsOf, isHaraka, type KeyCap, type LayoutId, strokeFor } from "~/engine/layout/ara.ts";

export interface VirtualKeyboardProps {
  layout: LayoutId;
  nextChar?: string;
  shiftHeld?: boolean;
}

const ROW_OFFSETS = ["", "", "pl-6", "pl-10"];

const KEY = "flex h-10 w-10 flex-col items-center justify-center rounded-md text-center transition-colors";
const IDLE = "bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400";
const TARGET = "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/40 dark:text-sky-300";

function keycapLabel(cap: KeyCap): { base: string; shift: string } {
  const base = cap.base === " " ? "" : cap.base;
  const shift = cap.shift === cap.base || cap.shift === " " ? "" : cap.shift;
  return { base, shift };
}

export default function VirtualKeyboard({ layout, nextChar, shiftHeld = false }: VirtualKeyboardProps) {
  const caps = capsOf(layout);
  const target = nextChar === undefined ? undefined : strokeFor(nextChar, layout);
  const needsShift = target?.shift === true;
  const rows = ROW_OFFSETS.map((_, row) => caps.filter((cap) => cap.row === row));
  const space = caps.find((cap) => cap.code === "Space");
  const spaceIsTarget = target?.code === "Space";

  return (
    <div
      data-cy="virtual-keyboard"
      data-layout={layout}
      data-next-code={target?.code ?? ""}
      className="select-none"
      dir="ltr"
    >
      <div className="flex flex-col items-center gap-1">
        {rows.map((row, index) => (
          <div key={index} className={`flex gap-1 ${ROW_OFFSETS[index] ?? ""}`}>
            {index === 3 ? <ShiftKey active={needsShift} held={shiftHeld} /> : null}
            {row.map((cap) => {
              const label = keycapLabel(cap);
              const isTarget = target?.code === cap.code;
              return (
                <div
                  key={cap.code}
                  data-cy="keycap"
                  data-code={cap.code}
                  data-target={isTarget ? "true" : "false"}
                  className={`${KEY} ${isTarget ? TARGET : IDLE}`}
                >
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
            className={`mt-0.5 h-8 w-64 rounded-md ${spaceIsTarget ? TARGET : IDLE}`}
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
      className={`flex h-10 w-14 items-center justify-center rounded-md text-[0.6rem] font-semibold uppercase tracking-wider transition-colors ${
        active || held ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : `${IDLE} text-stone-400`
      }`}
    >
      Shift
    </div>
  );
}
