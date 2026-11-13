export const KILOBYTE = 1024;

export interface Chunk {
  readonly name: string;
  readonly gzipBytes: number;
  readonly text: string;
}

const LIMITS = { entry: 130, surah: 80, words: 100 } as const;
const SURAH_CHUNK = /^\d{3}-/;
const WORDS_CHUNK = /^words-/;
const SURAH_COUNT = 114;
const SAMPLE_STEP = 125;
const LEAK_THRESHOLD = 10;
const ENTRY_SCRIPT = /<script[^>]*\btype="module"[^>]*\bsrc="[^"]*\/([^"/]+\.js)"/;

export function entryNameOf(html: string): string | null {
  return html.match(ENTRY_SCRIPT)?.[1] ?? null;
}

export function sampleWords(words: readonly string[]): string[] {
  return words.length <= SAMPLE_STEP ? [...words] : words.filter((_, index) => index % SAMPLE_STEP === 0);
}

function kilobytes(bytes: number): string {
  return (bytes / KILOBYTE).toFixed(1);
}

function overLimit(chunk: Chunk, label: string, limit: number): string[] {
  return chunk.gzipBytes > limit * KILOBYTE
    ? [`${label} ${chunk.name} is ${kilobytes(chunk.gzipBytes)} KB gzipped; the limit is ${limit} KB`]
    : [];
}

export function sizeProblems(chunks: readonly Chunk[], entryName: string, words: readonly string[]): string[] {
  const entry = chunks.find((chunk) => chunk.name === entryName);
  const surahs = chunks.filter((chunk) => SURAH_CHUNK.test(chunk.name));
  const lists = chunks.filter((chunk) => WORDS_CHUNK.test(chunk.name));
  const problems: string[] = [];

  if (entry === undefined) {
    problems.push(`the entry chunk ${entryName} is not in the build`);
  } else {
    problems.push(...overLimit(entry, "the entry chunk", LIMITS.entry));
    const leaked = sampleWords(words).filter((word) => entry.text.includes(word)).length;
    if (leaked >= LEAK_THRESHOLD) {
      problems.push(`Practice words are in the entry chunk ${entry.name} (${leaked} of the sample)`);
    }
  }
  for (const surah of surahs) {
    problems.push(...overLimit(surah, "the surah chunk", LIMITS.surah));
  }
  if (surahs.length !== SURAH_COUNT) {
    problems.push(`expected ${SURAH_COUNT} surah chunks, found ${surahs.length}`);
  }
  if (lists.length === 0) {
    problems.push("there is no chunk for the Practice words, so they are bundled with something else");
  }
  for (const list of lists) {
    problems.push(...overLimit(list, "the Practice list", LIMITS.words));
  }
  return problems;
}
