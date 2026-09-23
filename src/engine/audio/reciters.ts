export type ReciterId = "murattal" | "mujawwad";

export interface Reciter {
  id: ReciterId;
  name: string;
  style: string;
  kbps: number;
  note: string;
  folder: string;
}

const RECITER_BASE = "https://everyayah.com/data";

const RECITER_NAME = "Abdul Basit ʿAbd us-Samad";

const MURATTAL: Reciter = {
  id: "murattal",
  name: RECITER_NAME,
  style: "Murattal",
  kbps: 64,
  note: "measured, teaching-paced",
  folder: "Abdul_Basit_Murattal_64kbps",
};

export const RECITERS: readonly Reciter[] = [
  MURATTAL,
  {
    id: "mujawwad",
    name: RECITER_NAME,
    style: "Mujawwad",
    kbps: 128,
    note: "melodic and ornamented",
    folder: "Abdul_Basit_Mujawwad_128kbps",
  },
];

export const DEFAULT_RECITER: ReciterId = MURATTAL.id;

export const DEFAULT_VOLUME = 0.8;

const BY_ID: ReadonlyMap<string, Reciter> = new Map(RECITERS.map((r) => [r.id, r]));

export function isReciterId(value: unknown): value is ReciterId {
  return typeof value === "string" && BY_ID.has(value);
}

export function reciterOption(id: ReciterId): Reciter {
  return BY_ID.get(id) ?? MURATTAL;
}

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

export function ayahAudioUrl(id: ReciterId, surah: number, ayah: number): string {
  return `${RECITER_BASE}/${reciterOption(id).folder}/${pad(surah)}${pad(ayah)}.mp3`;
}

const BASMALA_SURAH = 1;
const BASMALA_AYAH = 1;

export interface AyahClip {
  ayah: number | null;
  url: string;
  basmala: boolean;
}

export interface ClipSpan {
  ayah: number;
}

export function passageClips(
  id: ReciterId,
  surah: number,
  spans: readonly ClipSpan[],
  leadingBasmala = false,
): AyahClip[] {
  const clips: AyahClip[] = leadingBasmala
    ? [{ ayah: null, url: ayahAudioUrl(id, BASMALA_SURAH, BASMALA_AYAH), basmala: true }]
    : [];
  for (const span of spans) {
    clips.push({ ayah: span.ayah, url: ayahAudioUrl(id, surah, span.ayah), basmala: false });
  }
  return clips;
}

export function firstClipOf(clips: readonly AyahClip[], ayah: number | null): number {
  const index = clips.findIndex((clip) => clip.ayah === ayah);
  return index < 0 ? 0 : index;
}

export function afterAyahOf(clips: readonly AyahClip[], index: number): number {
  const ayah = clips[index]?.ayah;
  let i = index + 1;
  while (i < clips.length && clips[i]?.ayah === ayah) {
    i += 1;
  }
  return i;
}

export function clampVolume(value: unknown): number {
  const volume = Number(value);
  if (!Number.isFinite(volume)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(1, Math.max(0, volume));
}
