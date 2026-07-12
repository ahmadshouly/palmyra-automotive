export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function timeAgo(date: Date, locale: string = "en") {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, secs] of units) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return rtf.format(-n, unit);
  }
  return rtf.format(0, "second");
}

export function formatMileage(km: number, locale: string = "en") {
  return `${km.toLocaleString()} ${locale === "ar" ? "\u0643\u0645" : "km"}`;
}

/** Builds a deterministic placeholder image URL for a vehicle. */
export function placeholderImage(label: string, seed: string) {
  return `/api/placeholder?label=${encodeURIComponent(label)}&seed=${encodeURIComponent(seed)}`;
}
