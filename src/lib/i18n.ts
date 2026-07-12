import { cache } from "react";
import { cookies } from "next/headers";
import { makeT, type Locale } from "@/lib/dictionary";
import type { SiteSettings } from "@/lib/settings";

export const LOCALE_COOKIE = "nm_locale";

/** Current locale from the cookie (defaults to English). */
export const getLocale = cache((): Locale => {
  return cookies().get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
});

/** Translate function bound to the current request's locale. */
export const getT = cache(() => makeT(getLocale()));

/**
 * Picks the Arabic variant of an admin-configured text setting when the
 * locale is Arabic and a translation has been provided in the admin panel.
 */
export function localized(
  settings: SiteSettings,
  base: "tagline" | "heroHeadline" | "heroSubheadline",
  locale: Locale
): string {
  if (locale === "ar") {
    const arValue = settings[`${base}Ar` as keyof SiteSettings];
    if (arValue) return arValue;
  }
  return settings[base];
}
