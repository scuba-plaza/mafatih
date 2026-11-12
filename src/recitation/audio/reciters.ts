import type { Passage, Span } from "../passage.ts";

export type ReciterId = "murattal" | "mujawwad";

export interface Reciter {
  readonly id: ReciterId;
  readonly name: string;
  readonly style: string;
  readonly kbps: number;
  readonly folder: string;
}

export interface AudioClip {
  readonly surah: number;
  readonly ayah: number;
  readonly span: Span;
}

const BASE_URL = "https://everyayah.com/data";
const NAME = "Abdul Basit ʿAbd us-Samad";
const BASMALA_CLIP = { surah: 1, ayah: 1 } as const;

const MURATTAL: Reciter = {
  id: "murattal",
  name: NAME,
  style: "Murattal",
  kbps: 64,
  folder: "Abdul_Basit_Murattal_64kbps",
};

export const RECITERS: readonly Reciter[] = [
  MURATTAL,
  { id: "mujawwad", name: NAME, style: "Mujawwad", kbps: 128, folder: "Abdul_Basit_Mujawwad_128kbps" },
];

export const DEFAULT_RECITER: ReciterId = "murattal";

export function isReciterId(value: unknown): value is ReciterId {
  return RECITERS.some((reciter) => reciter.id === value);
}

export function reciterOf(id: ReciterId): Reciter {
  return RECITERS.find((reciter) => reciter.id === id) ?? MURATTAL;
}

function digits(value: number): string {
  return String(value).padStart(3, "0");
}

export function ayahAudioUrl(id: ReciterId, surah: number, ayah: number): string {
  return `${BASE_URL}/${reciterOf(id).folder}/${digits(surah)}${digits(ayah)}.mp3`;
}

export function audioSequence(passage: Passage): readonly AudioClip[] {
  const basmala: AudioClip[] = passage.basmala === null ? [] : [{ ...BASMALA_CLIP, span: passage.basmala }];
  return [
    ...basmala,
    ...passage.ayat.map(({ ayah, start, end }) => ({ surah: passage.surah, ayah, span: { start, end } })),
  ];
}
