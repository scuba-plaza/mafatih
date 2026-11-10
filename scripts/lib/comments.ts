import { parseSync } from "oxc-parser";

export interface CommentFinding {
  line: number;
}

export function findComments(filename: string, source: string): readonly CommentFinding[] {
  const { comments } = parseSync(filename, source);
  return comments.map((comment) => ({ line: source.slice(0, comment.start).split("\n").length }));
}
