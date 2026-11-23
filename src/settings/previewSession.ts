import { buildPrompt } from "~/text/prompt.ts";
import { requiredMarks, type Vocalization } from "~/text/vocalization.ts";
import { applyKey, createSession, type Session } from "~/typing/session.ts";

export const PREVIEW_TEXT = "كِتَابٌ جَدِيدٌ عَلَى الطَّاوِلَةِ وَالقَلَمُ بِجَانِبِهِ";

const TYPED_PREFIX = "كِتَابٌ ";
const WRONG_KEY = "ب";
const KEY_INTERVAL_MS = 200;

export interface PreviewSessionOptions {
  readonly vocalization: Vocalization;
  readonly unlockedMarks: ReadonlySet<string>;
  readonly requireBackspace: boolean;
}

export function previewSession({ vocalization, unlockedMarks, requireBackspace }: PreviewSessionOptions): Session {
  const options = { requireBackspace };
  let session = createSession(buildPrompt(PREVIEW_TEXT, requiredMarks(vocalization, unlockedMarks)));
  for (let at = 0; ; at += KEY_INTERVAL_MS) {
    const unit = session.units[session.cursor];
    if (unit === undefined || unit.end > TYPED_PREFIX.length) {
      break;
    }
    session = applyKey(session, { kind: "char", char: unit.text }, at, options);
  }
  return applyKey(session, { kind: "char", char: WRONG_KEY }, KEY_INTERVAL_MS * TYPED_PREFIX.length, options);
}
