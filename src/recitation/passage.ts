import { buildPrompt, type Prompt } from "~/text/prompt.ts";
import type { Surah } from "./quran.ts";

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface AyahSpan extends Span {
  readonly ayah: number;
  readonly sign: Span;
  readonly lastUnit: number;
}

export interface Passage {
  readonly prompt: Prompt;
  readonly surah: number;
  readonly fromAyah: number;
  readonly toAyah: number;
  readonly ayat: readonly AyahSpan[];
  readonly basmala: Span | null;
}

const NO_BREAK_SPACE = "\u00A0";
const END_OF_AYAH = "\u06DD";
const ARABIC_ZERO = 0x660;

function arabicNumber(value: number): string {
  return [...String(value)].map((digit) => String.fromCodePoint(ARABIC_ZERO + Number(digit))).join("");
}

function atLeastOne(value: number): number {
  return Number.isNaN(value) ? 1 : Math.max(1, Math.floor(value));
}

export function buildPassage(surah: Surah, fromAyah: number, maxAyat: number, required: ReadonlySet<string>): Passage {
  const count = surah.ayat.length;
  const from = Math.min(atLeastOne(fromAyah), Math.max(1, count));
  const to = Math.min(from + atLeastOne(maxAyat) - 1, count);
  const basmala = from === 1 ? surah.basmala : null;
  const breaks = basmala === null ? [] : [basmala.length + 1];
  const spans: Omit<AyahSpan, "lastUnit">[] = [];
  let shown = basmala === null ? "" : `${basmala} `;
  for (let ayah = from; ayah <= to; ayah += 1) {
    const text = surah.ayat[ayah - 1] ?? "";
    const start = shown.length + (spans.length > 0 ? 1 : 0);
    const end = start + text.length;
    const sign = `${END_OF_AYAH}${arabicNumber(ayah)}`;
    shown = `${shown}${spans.length > 0 ? " " : ""}${text}${NO_BREAK_SPACE}${sign}`;
    spans.push({ ayah, start, end, sign: { start: end + 1, end: end + 1 + sign.length } });
  }
  const prompt = buildPrompt(shown, required, breaks);
  return {
    prompt,
    surah: surah.number,
    fromAyah: from,
    toAyah: to,
    ayat: spans.map((span) => ({ ...span, lastUnit: prompt.units.findLastIndex((unit) => unit.end <= span.end) })),
    basmala: basmala === null ? null : { start: 0, end: basmala.length },
  };
}
