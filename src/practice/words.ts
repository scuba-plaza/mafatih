export interface PracticeWord {
  readonly word: string;
  readonly rank: number;
  readonly pos: string;
}

export function parseWordList(text: string): PracticeWord[] {
  return text
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [word = "", rank = "", pos = ""] = line.split("\t");
      return { word, rank: Number(rank), pos };
    });
}

export async function loadWords(): Promise<readonly PracticeWord[]> {
  const list = await import("../../data/practice/words.tsv?raw");
  return parseWordList(list.default);
}
