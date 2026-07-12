import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { Cairo } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getLocale, getT, localized } from "@/lib/i18n";
import { dirFor } from "@/lib/dictionary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cairo = Cairo({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const locale = getLocale();
  return {
    title: {
      default: `${settings.siteName} — ${localized(settings, "tagline", locale)}`,
      template: `%s | ${settings.siteName}`,
    },
    description: localized(settings, "heroSubheadline", locale),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const locale = getLocale();
  const t = getT();
  const pathname = headers().get("x-pathname") ?? "/";

  const maintenanceOn = settings.maintenanceMode === "1";
  const exemptPath = pathname.startsWith("/login") || pathname.startsWith("/api");
  const blocked = maintenanceOn && !exemptPath && !(user && isStaff(user.role));

  return (
    <html lang={locale} dir={dirFor(locale)} className={cairo.variable}>
      <body className={`${cairo.className} flex min-h-screen flex-col`}>
        {blocked ? (
          <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-5xl font-black text-emerald-200">{settings.siteName}</p>
            <h1 className="text-2xl font-bold text-emerald-950">{t("maint.title")}</h1>
            <p className="max-w-md text-emerald-600">{t("maint.sub", { name: settings.siteName })}</p>
            <Link href="/login" className="text-sm font-semibold text-brand-600 hover:underline">
              {t("maint.staff")}
            </Link>
          </main>
        ) : (
          <>
            {maintenanceOn && (
              <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-emerald-950">
                {t("maint.banner")}
              </div>
            )}
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </>
        )}
      </body>
    </html>
  );
}
