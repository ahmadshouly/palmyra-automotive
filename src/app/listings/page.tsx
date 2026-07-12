import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getT } from "@/lib/i18n";
import {
  BODY_STYLES,
  CONDITIONS,
  FUEL_TYPES,
  POPULAR_MAKES,
  TRANSMISSIONS,
} from "@/lib/constants";
import ListingCard from "@/components/ListingCard";
import { saveSearchAction } from "@/app/actions/engagement";

export async function generateMetadata() {
  return { title: getT()("meta.browse") };
}
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Search = Record<string, string | undefined>;

function buildWhere(sp: Search): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  const num = (v?: string) => {
    const n = Number.parseInt((v ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  };

  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q } },
      { description: { contains: sp.q } },
      { make: { contains: sp.q } },
      { model: { contains: sp.q } },
    ];
  }
  if (sp.make) where.make = sp.make;
  if (sp.model) where.model = { contains: sp.model };
  if (sp.bodyStyle) where.bodyStyle = sp.bodyStyle;
  if (sp.fuelType) where.fuelType = sp.fuelType;
  if (sp.transmission) where.transmission = sp.transmission;
  if (sp.condition) where.condition = sp.condition;
  if (sp.state) where.state = { contains: sp.state };

  const minPrice = num(sp.minPrice);
  const maxPrice = num(sp.maxPrice);
  if (minPrice || maxPrice) where.price = { gte: minPrice, lte: maxPrice };

  const minYear = num(sp.minYear);
  const maxYear = num(sp.maxYear);
  if (minYear || maxYear) where.year = { gte: minYear, lte: maxYear };

  const maxMileage = num(sp.maxMileage);
  if (maxMileage) where.mileage = { lte: maxMileage };

  return where;
}

function orderBy(sort?: string): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "mileage":
      return [{ mileage: "asc" }];
    case "year":
      return [{ year: "desc" }];
    case "views":
      return [{ views: "desc" }];
    default:
      return [{ tier: "desc" }, { createdAt: "desc" }]; // featured first, then newest
  }
}

export default async function ListingsPage({ searchParams }: { searchParams: Search }) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const t = getT();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const where = buildWhere(searchParams);

  const [total, listings] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({
      where,
      orderBy: orderBy(searchParams.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterEntries = Object.entries(searchParams).filter(
    ([k, v]) => v && !["page", "sort", "saved"].includes(k)
  );
  const queryString = new URLSearchParams(
    Object.entries(searchParams).filter(([k, v]) => v && k !== "page" && k !== "saved") as [string, string][]
  ).toString();

  const pageLink = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
    );
    params.set("page", String(p));
    return `/listings?${params.toString()}`;
  };

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-emerald-950">{t("search.title")}</h1>
          <p className="text-sm text-emerald-600">
            {t("search.results", { count: total.toLocaleString() })}
            {filterEntries.length > 0 && ` ${t("search.matching")}`}
          </p>
        </div>
        <form action="/listings" className="flex items-center gap-2">
          {filterEntries.map(([k, v]) => k !== "sort" && <input key={k} type="hidden" name={k} value={v} />)}
          <label className="text-xs font-semibold uppercase text-emerald-600">{t("search.sort")}</label>
          <select name="sort" defaultValue={searchParams.sort ?? ""} className="input w-44">
            <option value="">{t("search.sortFeatured")}</option>
            <option value="price-asc">{t("search.sortPriceAsc")}</option>
            <option value="price-desc">{t("search.sortPriceDesc")}</option>
            <option value="year">{t("search.sortYear")}</option>
            <option value="mileage">{t("search.sortMileage")}</option>
            <option value="views">{t("search.sortViews")}</option>
          </select>
          <button className="btn-outline btn-sm">{t("search.apply")}</button>
        </form>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t("search.savedBanner")}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside>
          <form action="/listings" className="card sticky top-20 space-y-4 p-5">
            <div>
              <label className="label">{t("search.keyword")}</label>
              <input name="q" defaultValue={searchParams.q} className="input" placeholder={t("search.keywordPh")} />
            </div>
            <div>
              <label className="label">{t("search.make")}</label>
              <select name="make" defaultValue={searchParams.make ?? ""} className="input">
                <option value="">{t("common.any")}</option>
                {POPULAR_MAKES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("search.model")}</label>
              <input name="model" defaultValue={searchParams.model} className="input" placeholder={t("search.modelPh")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("search.minPrice")}</label>
                <input name="minPrice" type="number" defaultValue={searchParams.minPrice} className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">{t("search.maxPrice")}</label>
                <input name="maxPrice" type="number" defaultValue={searchParams.maxPrice} className="input" placeholder={t("common.any")} />
              </div>
              <div>
                <label className="label">{t("search.minYear")}</label>
                <input name="minYear" type="number" defaultValue={searchParams.minYear} className="input" placeholder={t("common.any")} />
              </div>
              <div>
                <label className="label">{t("search.maxYear")}</label>
                <input name="maxYear" type="number" defaultValue={searchParams.maxYear} className="input" placeholder={t("common.any")} />
              </div>
            </div>
            <div>
              <label className="label">{t("search.maxMileage")}</label>
              <input name="maxMileage" type="number" defaultValue={searchParams.maxMileage} className="input" placeholder={t("common.any")} />
            </div>
            <div>
              <label className="label">{t("search.bodyStyle")}</label>
              <select name="bodyStyle" defaultValue={searchParams.bodyStyle ?? ""} className="input">
                <option value="">{t("common.any")}</option>
                {BODY_STYLES.map((b) => (
                  <option key={b} value={b}>{t(`opt.bodyStyle.${b}` as never)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("search.fuelType")}</label>
              <select name="fuelType" defaultValue={searchParams.fuelType ?? ""} className="input">
                <option value="">{t("common.any")}</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{t(`opt.fuelType.${f}` as never)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("search.transmission")}</label>
              <select name="transmission" defaultValue={searchParams.transmission ?? ""} className="input">
                <option value="">{t("common.any")}</option>
                {TRANSMISSIONS.map((x) => (
                  <option key={x} value={x}>{t(`opt.transmission.${x}` as never)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("search.condition")}</label>
              <select name="condition" defaultValue={searchParams.condition ?? ""} className="input">
                <option value="">{t("common.any")}</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{t(`opt.condition.${c}` as never)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("search.state")}</label>
              <input name="state" defaultValue={searchParams.state} className="input" placeholder={t("search.statePh")} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-primary flex-1">{t("search.applyFilters")}</button>
              <Link href="/listings" className="btn-outline">{t("search.reset")}</Link>
            </div>
          </form>

          {/* Save search */}
          {filterEntries.length > 0 && (
            <div className="card mt-4 p-5">
              {user ? (
                <form action={saveSearchAction} className="space-y-2">
                  <label className="label">{t("search.saveSearch")}</label>
                  <input type="hidden" name="query" value={queryString} />
                  <input name="name" className="input" placeholder={t("search.saveNamePh")} required />
                  <button className="btn-outline btn-sm w-full">{t("search.saveBtn")}</button>
                </form>
              ) : (
              <p className="text-sm text-emerald-600">
                <Link href="/login" className="font-semibold text-brand-600 hover:underline">{t("search.signInToSave")}</Link>{" "}
                {t("search.signInToSaveRest")}
              </p>
            )}
          </div>
        )}
        </aside>

        {/* Results */}
        <div>
          {listings.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-16 text-center">
              <p className="text-lg font-bold text-emerald-950">{t("search.noMatches")}</p>
              <p className="max-w-sm text-sm text-emerald-600">{t("search.noMatchesSub")}</p>
              <Link href="/listings" className="btn-primary mt-2">{t("search.clearAll")}</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l) => <ListingCard key={l.id} listing={l} currency={settings.currency} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && <Link href={pageLink(page - 1)} className="btn-outline btn-sm">{t("common.previous")}</Link>}
              <span className="px-3 text-sm text-emerald-600">{t("common.page", { page, total: totalPages })}</span>
              {page < totalPages && <Link href={pageLink(page + 1)} className="btn-outline btn-sm">{t("common.next")}</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
