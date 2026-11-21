export interface WordSpan {
  readonly start: number;
  readonly end: number;
}

const SPACE = /\s/u;

function isSpace(character: string): boolean {
  return SPACE.test(character);
}

export function wordInProgress(text: string, offset: number, from: number, to: number): WordSpan | null {
  if (offset <= from || offset >= to || isSpace(text.charAt(offset - 1)) || isSpace(text.charAt(offset))) {
    return null;
  }
  let start = offset - 1;
  while (start > from && !isSpace(text.charAt(start - 1))) {
    start -= 1;
  }
  let end = offset + 1;
  while (end < to && !isSpace(text.charAt(end))) {
    end += 1;
  }
  return { start, end };
}
