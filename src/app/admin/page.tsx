import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, getSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/utils";
import { getLocale, getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const settings = await getSettings();
  const feePct = Number.parseFloat(settings.transactionFeePct) || 0;
  const locale = getLocale();
  const t = getT();

  const [
    totalUsers,
    newUsers7d,
    activeListings,
    pendingListings,
    soldListings,
    gmvAgg,
    offersPending,
    inspectionsOpen,
    recentUsers,
    recentListings,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.listing.count({ where: { status: "PENDING" } }),
    db.listing.count({ where: { status: "SOLD" } }),
    db.listing.aggregate({ _sum: { soldPrice: true }, where: { status: "SOLD" } }),
    db.offer.count({ where: { status: "PENDING" } }),
    db.inspection.count({ where: { status: { in: ["REQUESTED", "SCHEDULED"] } } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.listing.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { seller: true } }),
  ]);

  const gmv = gmvAgg._sum.soldPrice ?? 0;
  const revenue = Math.round((gmv * feePct) / 100);
  const currency = settings.currency;

  const kpis: [string, string, string?][] = [
    [t("admin.overview.kpi.totalUsers"), totalUsers.toLocaleString(), t("admin.overview.thisWeek", { count: newUsers7d })],
    [t("admin.overview.kpi.activeListings"), activeListings.toLocaleString(), t("admin.overview.awaitingReview", { count: pendingListings })],
    [t("admin.overview.kpi.vehiclesSold"), soldListings.toLocaleString(), t("admin.overview.openOffers", { count: offersPending })],
    [t("admin.overview.kpi.gmv"), formatMoney(gmv, currency), t("admin.overview.takeRate", { fee: feePct })],
    [t("admin.overview.kpi.estRevenue"), formatMoney(revenue, currency)],
    [t("admin.overview.kpi.openInspections"), inspectionsOpen.toLocaleString()],
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-emerald-950">{t("admin.overview.title")}</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{label}</p>
            <p className="mt-1 text-2xl font-black text-emerald-950">{value}</p>
            {sub && <p className="mt-1 text-xs text-emerald-600">{sub}</p>}
          </div>
        ))}
      </div>

      {pendingListings > 0 && (
        <Link
          href="/admin/listings"
          className="mt-6 block rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 hover:bg-amber-100"
        >
          {t("admin.overview.moderationQueue", { count: pendingListings, plural: pendingListings === 1 ? "" : "s" })}
        </Link>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold text-emerald-950">{t("admin.overview.newestUsers")}</h2>
          <ul className="mt-3 divide-y divide-emerald-50 text-sm">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <span>
                  <span className="font-semibold">{u.name}</span>
                  <span className="ms-2 text-xs text-emerald-500">{u.email}</span>
                </span>
                <span className="text-xs text-emerald-600">{t(`opt.role.${u.role}` as never)} · {timeAgo(u.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="font-bold text-emerald-950">{t("admin.overview.newestListings")}</h2>
          <ul className="mt-3 divide-y divide-emerald-50 text-sm">
            {recentListings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/listings/${l.id}`} className="min-w-0 truncate font-semibold text-brand-700 hover:underline">
                  {l.title}
                </Link>
                <span className="shrink-0 text-xs text-emerald-600">
                  {formatMoney(l.price, currency)} · {t(`opt.status.${l.status}` as never)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
