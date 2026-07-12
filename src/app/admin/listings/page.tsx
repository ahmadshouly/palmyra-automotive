import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, getSettings } from "@/lib/settings";
import { parseJsonArray, timeAgo } from "@/lib/utils";
import { moderateListingAction } from "@/app/actions/admin";
import { getLocale, getT } from "@/lib/i18n";

export const metadata = { title: "Listing moderation" };
export const dynamic = "force-dynamic";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const settings = await getSettings();
  const locale = getLocale();
  const t = getT();

  const tabs = [
    { key: "PENDING", label: t("admin.listings.tabs.pending") },
    { key: "ACTIVE", label: t("admin.listings.tabs.active") },
    { key: "REJECTED", label: t("admin.listings.tabs.rejected") },
    { key: "SOLD", label: t("admin.listings.tabs.sold") },
    { key: "ARCHIVED", label: t("admin.listings.tabs.archived") },
  ];
  const status = tabs.some((t) => t.key === searchParams.status) ? searchParams.status! : "PENDING";

  const [counts, listings] = await Promise.all([
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.listing.findMany({
      where: { status },
      include: { seller: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <div>
      <h1 className="text-2xl font-black text-emerald-950">{t("admin.listings.title")}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/listings?status=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              status === t.key
                ? "bg-emerald-950 text-white"
                : "border border-emerald-200 bg-white text-emerald-600 hover:border-brand-400"
            }`}
          >
            {t.label} ({countMap[t.key] ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {listings.length === 0 && (
          <div className="card p-12 text-center text-sm text-emerald-600">{t("admin.listings.empty")}</div>
        )}
        {listings.map((l) => {
          const cover =
            parseJsonArray(l.images)[0] ??
            `/api/placeholder?label=${encodeURIComponent(l.title)}&seed=${l.id}`;
          return (
            <div key={l.id} className="card flex flex-col gap-4 p-5 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="aspect-[8/5] w-full rounded-lg object-cover sm:w-48" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/listings/${l.id}`} className="font-bold text-brand-700 hover:underline">
                    {l.title}
                  </Link>
                  <span className="badge border-emerald-100 bg-emerald-50 text-emerald-700">
                    {t(`admin.listings.tier.${l.tier.toLowerCase()}` as never)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-emerald-600">
                  {t("admin.listings.price", {
                    price: formatMoney(l.price, settings.currency),
                    year: l.year,
                    mileage: l.mileage.toLocaleString(),
                    city: l.city,
                    state: l.state,
                    vin: l.vin ?? "—",
                  })}
                </p>
                <p className="mt-1 text-xs text-emerald-500">
                  {t("admin.listings.seller", {
                    name: l.seller.name,
                    email: l.seller.email,
                    time: timeAgo(l.createdAt, locale),
                  })}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-emerald-800">{l.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/listings/${l.id}/edit`} className="btn-outline btn-sm">
                    {t("common.edit")}
                  </Link>
                  {status !== "ACTIVE" && status !== "SOLD" && (
                    <form action={moderateListingAction.bind(null, l.id)}>
                      <input type="hidden" name="decision" value="approve" />
                      <button className="btn-success btn-sm">{t("admin.listings.approve")}</button>
                    </form>
                  )}
                  {status !== "REJECTED" && status !== "SOLD" && (
                    <form action={moderateListingAction.bind(null, l.id)} className="flex items-center gap-1">
                      <input type="hidden" name="decision" value="reject" />
                      <input name="reason" placeholder={t("admin.listings.reason")} className="input w-44 py-1.5 text-xs" />
                      <button className="btn-danger btn-sm">{t("admin.listings.reject")}</button>
                    </form>
                  )}
                  {status === "ACTIVE" && (
                    <>
                      <form action={moderateListingAction.bind(null, l.id)} className="flex items-center gap-1">
                        <input type="hidden" name="decision" value="feature" />
                        <select name="tier" defaultValue={l.tier} className="input w-32 py-1.5 text-xs">
                          <option value="FREE">{t("admin.listings.tier.free")}</option>
                          <option value="PREMIUM">{t("admin.listings.tier.premium")}</option>
                          <option value="ULTIMATE">{t("admin.listings.tier.ultimate")}</option>
                        </select>
                        <button className="btn-outline btn-sm">{t("admin.listings.setTier")}</button>
                      </form>
                      <form action={moderateListingAction.bind(null, l.id)}>
                        <input type="hidden" name="decision" value="archive" />
                        <button className="btn-outline btn-sm">{t("admin.listings.takeDown")}</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
