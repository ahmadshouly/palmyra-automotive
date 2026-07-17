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

/**
 * Builds a WhatsApp link. Accepts either a full link pasted by the admin
 * (e.g. https://wa.me/... or a wa.me short link) — used as-is — or a phone
 * number, which is turned into a wa.me link. Returns null when unset/invalid.
 */
export function whatsappLink(value: string | undefined | null, text?: string): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  // A full link pasted from WhatsApp — use it directly.
  if (/^https?:\/\//i.test(raw)) {
    if (text && !raw.includes("?")) return `${raw}?text=${encodeURIComponent(text)}`;
    return raw;
  }

  // Otherwise treat it as a phone number.
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 6) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/** Builds a deterministic placeholder image URL for a vehicle. */
export function placeholderImage(label: string, seed: string) {
  return `/api/placeholder?label=${encodeURIComponent(label)}&seed=${encodeURIComponent(seed)}`;
}
