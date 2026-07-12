import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, formatMoney } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getT, localized } from "@/lib/i18n";
import { BODY_STYLES, POPULAR_MAKES } from "@/lib/constants";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const locale = getLocale();
  const t = getT();

  const [featured, trending, newest] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE", tier: { in: ["PREMIUM", "ULTIMATE"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.listing.findMany({ where: { status: "ACTIVE" }, orderBy: { views: "desc" }, take: 4 }),
    db.listing.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const priceOptions = [15000, 25000, 40000, 60000, 100000];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.bannerPath}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-black/30" />
        <div className="container-page relative flex min-h-[520px] flex-col items-center py-16 sm:min-h-[600px] sm:py-20">
          {/* Quick search */}
          <form action="/listings" className="order-1 -mt-4 w-full max-w-4xl gap-2 rounded-xl bg-white/95 p-3 shadow-2xl backdrop-blur sm:grid sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{t("home.anyMake")}</label>
              <select name="make" className="input py-1.5 text-sm" defaultValue="">
                <option value="">{t("home.anyMake")}</option>
                {POPULAR_MAKES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{t("home.anyBody")}</label>
              <select name="bodyStyle" className="input py-1.5 text-sm" defaultValue="">
                <option value="">{t("home.anyBody")}</option>
                {BODY_STYLES.map((b) => (
                  <option key={b} value={b}>{t(`opt.bodyStyle.${b}` as never)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{t("home.anyPrice")}</label>
              <select name="maxPrice" className="input py-1.5 text-sm" defaultValue="">
                <option value="">{t("home.anyPrice")}</option>
                {priceOptions.map((p) => (
                  <option key={p} value={p}>
                    {t("home.under", { price: formatMoney(p, settings.currency) })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full px-4 py-2 text-sm">{t("home.search")}</button>
            </div>
          </form>

          <div className="order-2 mt-auto">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">{settings.siteName}</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {localized(settings, "heroHeadline", locale)}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/90">
              {localized(settings, "heroSubheadline", locale)}
            </p>
          </div>
        </div>
      </section>

      {/* Body style shortcuts */}
      <section className="container-page py-10">
        <div className="flex flex-wrap gap-2">
          {BODY_STYLES.map((b) => (
            <Link
              key={b}
              href={`/listings?bodyStyle=${encodeURIComponent(b)}`}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:border-brand-400 hover:text-brand-700"
            >
              {t(`opt.bodyStyle.${b}` as never)}
            </Link>
          ))}
          <Link
            href="/listings?fuelType=Electric"
            className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:border-brand-400"
          >
            {t("home.electric")}
          </Link>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-page py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">{t("home.featured")}</h2>
            <Link href="/listings" className="text-sm font-semibold text-brand-600 hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((l) => <ListingCard key={l.id} listing={l} currency={settings.currency} />)}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section className="container-page py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">{t("home.trending")}</h2>
            <Link href="/listings?sort=views" className="text-sm font-semibold text-brand-600 hover:underline">
              {t("home.seeHot")}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((l) => <ListingCard key={l.id} listing={l} currency={settings.currency} />)}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section className="container-page py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">{t("home.newArrivals")}</h2>
          <Link href="/listings?sort=newest" className="text-sm font-semibold text-brand-600 hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {newest.map((l) => <ListingCard key={l.id} listing={l} currency={settings.currency} />)}
        </div>
      </section>

      {/* How it works / trust */}
      <section className="mt-10 bg-emerald-50 py-14">
        <div className="container-page">
          <div className="flex flex-col items-center gap-3">
            <Link href="/listings" className="btn-primary px-8 py-3 text-base">
              {t("home.browseCta")}
            </Link>
            <p className="text-sm text-emerald-700">{t("home.browseSub")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
