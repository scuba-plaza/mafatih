import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

export interface WiktionarySense {
  readonly tags?: readonly string[];
  readonly glosses?: readonly string[];
}

export interface WiktionaryForm {
  readonly form?: string;
  readonly tags?: readonly string[];
}

export interface WiktionaryEntry {
  readonly word?: string;
  readonly pos?: string;
  readonly senses?: readonly WiktionarySense[];
  readonly forms?: readonly WiktionaryForm[];
}

export async function* readEntries(gzippedJsonLines: string): AsyncGenerator<WiktionaryEntry> {
  const lines = createInterface({ input: createReadStream(gzippedJsonLines).pipe(createGunzip()) });
  for await (const line of lines) {
    if (line.trim() !== "") {
      const entry: WiktionaryEntry = JSON.parse(line);
      yield entry;
    }
  }
}
