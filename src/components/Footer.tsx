import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getT, localized } from "@/lib/i18n";

export default async function Footer() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const locale = getLocale();
  const t = getT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-emerald-100 bg-emerald-950 text-emerald-100">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-white">{settings.siteName}</p>
          <p className="mt-2 text-sm text-emerald-200">{localized(settings, "tagline", locale)}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-200">{t("footer.marketplace")}</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings" className="hover:text-white">{t("footer.browse")}</Link></li>
            {user?.role === "ADMIN" && (
              <li><Link href="/sell" className="hover:text-white">{t("footer.sell")}</Link></li>
            )}
            <li><Link href="/compare" className="hover:text-white">{t("footer.compare")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-200">{t("footer.services")}</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings?fuelType=Electric" className="hover:text-white">{t("footer.ev")}</Link></li>
            <li><Link href="/listings?bodyStyle=SUV" className="hover:text-white">{t("footer.suvs")}</Link></li>
            <li><Link href="/listings?bodyStyle=Truck" className="hover:text-white">{t("footer.trucks")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-200">{t("footer.support")}</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={`mailto:${settings.supportEmail}`} className="hover:text-white">
                {settings.supportEmail}
              </a>
            </li>
            <li><Link href="/login" className="hover:text-white">{t("footer.account")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-emerald-900 py-4 text-center text-xs text-emerald-300">
        © {year} {settings.siteName}. {t("footer.rights")}
      </div>
    </footer>
  );
}
