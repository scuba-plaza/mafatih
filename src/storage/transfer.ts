import { isRecord } from "~/lib/guards.ts";
import { type Profile, sanitizeProfile } from "./profile.ts";

export const MAX_IMPORT_BYTES = 2_000_000;

const APP = "mafatih";
const SCHEMA = 2;
const LEGACY_SCHEMA = 1;

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

function isUnversionedOldExport(envelope: Readonly<Record<string, unknown>>): boolean {
  const { app, schema, progress, stats, settings, history, recitation } = envelope;
  return (
    app === undefined &&
    schema === undefined &&
    isRecord(progress) &&
    isRecord(stats) &&
    isRecord(settings) &&
    Array.isArray(history) &&
    isRecord(recitation)
  );
}

export function exportProfile(profile: Profile, now: Date): Backup {
  const envelope = { app: APP, schema: SCHEMA, exportedAt: now.toISOString(), profile };
  return { filename: `mafatih-backup-${dayOf(now)}.json`, json: JSON.stringify(envelope) };
}

export function importProfile(text: string, preferredLanguages: readonly string[]): ImportResult {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) {
    return refuse("too-large");
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    return refuse("not-json");
  }
  if (!isRecord(envelope)) {
    return refuse("not-a-backup");
  }
  const { app, schema, profile } = envelope;
  if (isUnversionedOldExport(envelope)) {
    return refuse("wrong-version");
  }
  const oldAppExport = app === undefined && schema === LEGACY_SCHEMA;
  if ((app !== APP && !oldAppExport) || typeof schema !== "number") {
    return refuse("not-a-backup");
  }
  if (schema !== SCHEMA) {
    return refuse("wrong-version");
  }
  return isRecord(profile)
    ? { ok: true, profile: sanitizeProfile(profile, preferredLanguages) }
    : refuse("not-a-backup");
}
