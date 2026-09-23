export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) {
    return (0).toFixed(digits);
  }
  return value.toFixed(digits);
}

export function formatPercent(ratio: number): string {
  return `${formatNumber(ratio * 100)}%`;
}

export function formatSeconds(ms: number): string {
  return `${formatNumber(ms / 1000, 1)}s`;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatNumber(value, unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`;
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export const END_OF_AYAH = "۝";

export function toArabicDigits(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }
  return [...String(Math.floor(value))].map((digit) => ARABIC_DIGITS[Number(digit)] ?? digit).join("");
}

export function ayahMark(ayah: number): string {
  return `${END_OF_AYAH}${toArabicDigits(ayah)}`;
}
