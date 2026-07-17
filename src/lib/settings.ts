import { cache } from "react";
import { db } from "@/lib/db";

// The app/brand name is NEVER hardcoded in UI code — it always comes from
// SiteSetting rows, editable in the admin panel. These are only the
// bootstrap defaults used before an admin saves custom values.
export const SETTING_DEFAULTS = {
  siteName: "Nahda Motors",
  tagline: "The trusted marketplace for your next car",
  taglineAr: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0645\u0648\u062b\u0648\u0642 \u0644\u0633\u064a\u0627\u0631\u062a\u0643 \u0627\u0644\u0642\u0627\u062f\u0645\u0629",
  bannerPath: "/assets/banner.jpeg",
  heroHeadline: "Find your perfect car",
  heroHeadlineAr: "\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0633\u064a\u0627\u0631\u062a\u0643 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629",
  heroSubheadline: "Verified sellers, inspected vehicles, secure payments and nationwide delivery.",
  heroSubheadlineAr: "\u0628\u0627\u0626\u0639\u0648\u0646 \u0645\u0648\u062b\u0651\u0642\u0648\u0646\u060c \u0633\u064a\u0627\u0631\u0627\u062a \u0645\u0641\u062d\u0648\u0635\u0629\u060c \u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0622\u0645\u0646\u0629 \u0648\u062a\u0648\u0635\u064a\u0644 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u0627\u0637\u0642.",
  transactionFeePct: "4",
  currency: "USD",
  supportEmail: "support@example.com",
  whatsappNumber: "",
  maintenanceMode: "0",
} as const;

export type SiteSettings = { [K in keyof typeof SETTING_DEFAULTS]: string };

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await db.siteSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...SETTING_DEFAULTS, ...map } as SiteSettings;
});

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
