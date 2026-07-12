import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { logoutAction } from "@/app/actions/auth";
import { setLocaleAction } from "@/app/actions/locale";

export default async function Header() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const locale = getLocale();
  const t = getT();
  const isAdmin = user?.role === "ADMIN";
  const pathname = headers().get("x-invoke-path") ?? "/";
  const overBanner = pathname === "/";

  const navLinkClass = overBanner
    ? "rounded-lg px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-50/50 hover:text-brand-700"
    : "rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 hover:text-brand-700";

  return (
    <header className={`sticky top-0 z-40 border-b ${overBanner ? "border-emerald-100/30 bg-transparent text-emerald-950" : "border-emerald-100 bg-white/95 text-emerald-950 backdrop-blur"}`}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/palmyra_logo.png"
            alt={settings.siteName}
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-contain"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-emerald-950">{settings.siteName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/listings" className={navLinkClass}>
            {t("nav.buy")}
          </Link>
          {isAdmin && (
            <Link href="/sell" className={navLinkClass}>
              {t("nav.sell")}
            </Link>
          )}
          <Link href="/compare" className={navLinkClass}>
            {t("nav.compare")}
          </Link>
          {user && (
            <Link href="/dashboard" className={navLinkClass}>
              {t("nav.dashboard")}
            </Link>
          )}
          {user && isStaff(user.role) && (
            <Link href="/admin" className={`rounded-lg px-3 py-2 text-sm font-medium ${overBanner ? "text-amber-700 hover:bg-emerald-50/50" : "text-amber-600 hover:bg-amber-50"}`}>
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <form action={setLocaleAction.bind(null, locale === "ar" ? "en" : "ar")}>
            <button
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${overBanner ? "border-emerald-200/60 text-emerald-950 hover:bg-emerald-50/50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-brand-700"}`}
              title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              {locale === "ar" ? "English" : "العربية"}
            </button>
          </form>

          {user ? (
            <details className="group relative">
              <summary className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${overBanner ? "text-emerald-950 hover:bg-emerald-50/50" : "text-emerald-800 hover:bg-emerald-50"} [&::-webkit-details-marker]:hidden`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </summary>
              <div className="absolute end-0 mt-2 w-56 rounded-xl border border-emerald-100 bg-white p-2 text-emerald-950 shadow-xl">
                <div className="border-b border-emerald-50 px-3 py-2">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-emerald-600">{t(`opt.role.${user.role}` as never)}</p>
                </div>
                <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-emerald-50">
                  {t("nav.dashboard")}
                </Link>
                {isAdmin && (
                  <Link href="/sell" className="block rounded-lg px-3 py-2 text-sm hover:bg-emerald-50">
                    {t("nav.sellACar")}
                  </Link>
                )}
                {isStaff(user.role) && (
                  <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm hover:bg-emerald-50">
                    {t("nav.adminPanel")}
                  </Link>
                )}
                <form action={logoutAction}>
                  <button className="w-full rounded-lg px-3 py-2 text-start text-sm text-rose-600 hover:bg-rose-50">
                    {t("nav.signOut")}
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className={navLinkClass}>
                {t("nav.signIn")}
              </Link>
              <Link href="/register" className={overBanner ? "btn rounded-lg bg-brand-600 text-white hover:bg-brand-700" : "btn-primary"}>
                {t("nav.getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
