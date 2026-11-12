import { isRecord } from "~/lib/guards.ts";
import { type Profile, sanitizeProfile } from "./profile.ts";

export const MAX_IMPORT_BYTES = 2_000_000;

const APP = "mafatih";
const SCHEMA = 2;

export type ImportFailure = "too-large" | "not-json" | "not-a-backup" | "wrong-version";

export type ImportResult =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly reason: ImportFailure };

export interface Backup {
  readonly filename: string;
  readonly json: string;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function dayOf(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

function refuse(reason: ImportFailure): ImportResult {
  return { ok: false, reason };
}

export function exportProfile(profile: Profile, now: Date): Backup {
  const envelope = { app: APP, schema: SCHEMA, exportedAt: now.toISOString(), profile };
  return { filename: `mafatih-backup-${dayOf(now)}.json`, json: JSON.stringify(envelope) };
}

export function importProfile(text: string): ImportResult {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) {
    return refuse("too-large");
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    return refuse("not-json");
  }
  if (!isRecord(envelope) || typeof envelope.schema !== "number") {
    return refuse("not-a-backup");
  }
  if (envelope.app !== undefined && envelope.app !== APP) {
    return refuse("not-a-backup");
  }
  if (envelope.schema !== SCHEMA) {
    return refuse("wrong-version");
  }
  if (envelope.app !== APP || !isRecord(envelope.profile)) {
    return refuse("not-a-backup");
  }
  return { ok: true, profile: sanitizeProfile(envelope.profile, []) };
}
