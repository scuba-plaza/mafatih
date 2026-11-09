import { type KeyStroke, LIGATURE_KEYS, strokeFor, WIN101_CAPS } from "~/engine/layout.ts";

interface KeyboardProps {
  remaining: string;
  wrong: string | null;
}

function nextStroke(remaining: string): KeyStroke | undefined {
  const ligature = LIGATURE_KEYS.get(remaining.slice(0, 2));
  if (ligature !== undefined) {
    return strokeFor(ligature);
  }
  return strokeFor(remaining[0] ?? "");
}

export function Keyboard({ remaining, wrong }: KeyboardProps) {
  const stroke = wrong === null ? nextStroke(remaining) : undefined;
  const rows = [0, 1, 2, 3].map((row) => WIN101_CAPS.filter((cap) => cap.row === row));
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-1 select-none">
      {rows.map((caps, index) => (
        <div key={index} className="flex gap-1" style={{ marginLeft: `${index * 1.25}rem` }}>
          {caps.map((cap) => {
            const isNext = stroke !== undefined && stroke.code === cap.code;
            const shiftNeeded = isNext && stroke.shift && cap.shift !== cap.base;
            const glyph = shiftNeeded ? cap.shift : cap.base;
            return (
              <span key={cap.code} className={`key-cap ${isNext ? "next" : ""} ${shiftNeeded ? "shift-on" : ""}`}>
                {glyph}
              </span>
            );
          })}
        </div>
      ))}
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {stroke === undefined ? " " : stroke.shift ? "Hold Shift" : "\u00a0"}
      </p>
    </div>
  );
}
