import { type Profile, parseProfileOrNull } from "~/storage/profile.ts";

export const OVERWRITE_WARNING =
  "This replaces everything saved on this device — progress, statistics, recitation and settings — with the imported data. It cannot be undone.\n\nContinue?";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeProfile(profile: Profile): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(profile)));
}

export function decodeProfile(data: string): Profile | null {
  try {
    return parseProfileOrNull(new TextDecoder().decode(fromBase64Url(data)));
  } catch {
    return null;
  }
}

export function transferLink(profile: Profile): string {
  const url = new URL(window.location.href);
  url.hash = `/import/${encodeProfile(profile)}`;
  return url.toString();
}

export function exportFilename(at: Date = new Date()): string {
  return `mafatih-progress-${at.toISOString().slice(0, 10)}.json`;
}

export function profileBlob(profile: Profile): Blob {
  return new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
}

export function downloadProfile(profile: Profile): void {
  const url = URL.createObjectURL(profileBlob(profile));
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFilename();
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
