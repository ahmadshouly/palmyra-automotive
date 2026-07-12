import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney, getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { timeAgo } from "@/lib/utils";
import ListingCard from "@/components/ListingCard";
import {
  buyerOfferAction,
  deleteSavedSearchAction,
  respondOfferAction,
  respondTestDriveAction,
} from "@/app/actions/engagement";
import { archiveListingAction } from "@/app/actions/listings";

export async function generateMetadata() {
  return { title: getT()("meta.dashboard") };
}
export const dynamic = "force-dynamic";

const LISTING_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "border-brand-200 bg-brand-50 text-brand-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  SOLD: "border-emerald-900 bg-emerald-950 text-white",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  ARCHIVED: "border-emerald-100 bg-emerald-50 text-emerald-500",
  DRAFT: "border-emerald-100 bg-emerald-50 text-emerald-500",
};

const OFFER_STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  ACCEPTED: "border-brand-200 bg-brand-50 text-brand-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  COUNTERED: "border-brand-200 bg-brand-50 text-brand-700",
  WITHDRAWN: "border-emerald-100 bg-emerald-50 text-emerald-500",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const locale = getLocale();
  const t = getT();
  const currency = settings.currency;
  const isAdmin = user.role === "ADMIN";

  const [myListings, offersReceived, offersSent, favorites, conversations, testDrivesForMe, savedSearches] =
    await Promise.all([
      db.listing.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" } }),
      db.offer.findMany({
        where: { listing: { sellerId: user.id } },
        include: { listing: true, buyer: true },
        orderBy: { createdAt: "desc" },
      }),
      db.offer.findMany({
        where: { buyerId: user.id },
        include: { listing: true },
        orderBy: { createdAt: "desc" },
      }),
      db.favorite.findMany({
        where: { userId: user.id },
        include: { listing: true },
        orderBy: { createdAt: "desc" },
      }),
      db.conversation.findMany({
        where: { OR: [{ buyerId: user.id }, { listing: { sellerId: user.id } }] },
        include: {
          listing: { include: { seller: true } },
          buyer: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.testDrive.findMany({
        where: { listing: { sellerId: user.id } },
        include: { listing: true, buyer: true },
        orderBy: { createdAt: "desc" },
      }),
      db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);

  const activeCount = myListings.filter((l) => l.status === "ACTIVE").length;
  const soldGMV = myListings.filter((l) => l.soldPrice).reduce((a, l) => a + (l.soldPrice ?? 0), 0);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-emerald-950">{t("dash.hi", { name: user.name.split(" ")[0] })}</h1>
          <p className="mt-1 text-sm text-emerald-600">{t("dash.sub")}</p>
        </div>
        {isAdmin && <Link href="/sell" className="btn-primary">{t("dash.newListing")}</Link>}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [t("dash.statActive"), String(activeCount)],
          [t("dash.statOffers"), t("dash.pendingCount", { count: offersReceived.filter((o) => o.status === "PENDING").length })],
          [t("dash.statFavorites"), String(favorites.length)],
          [t("dash.statSales"), formatMoney(soldGMV, currency)],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{l}</p>
            <p className="mt-1 text-xl font-black text-emerald-950">{v}</p>
          </div>
        ))}
      </div>

      {/* My listings */}
      {(isAdmin || myListings.length > 0) && (
      <section className="mt-10">
        <h2 className="section-title mb-4">{t("dash.myListings")}</h2>
        {myListings.length === 0 ? (
          <div className="card p-10 text-center text-sm text-emerald-600">
            {t("dash.noListings")}{" "}
            <Link href="/sell" className="font-semibold text-brand-600 hover:underline">{t("dash.createFirst")}</Link>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>{t("dash.thVehicle")}</th><th>{t("dash.thPrice")}</th><th>{t("dash.thStatus")}</th><th>{t("dash.thViews")}</th><th>{t("dash.thListed")}</th><th></th></tr>
              </thead>
              <tbody>
                {myListings.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/listings/${l.id}`} className="font-semibold text-brand-700 hover:underline">
                        {l.title}
                      </Link>
                      {l.status === "REJECTED" && l.rejectReason && (
                        <p className="mt-0.5 text-xs text-rose-600">{t("dash.reason")}: {l.rejectReason}</p>
                      )}
                    </td>
                    <td>{formatMoney(l.price, currency)}</td>
                    <td><span className={`badge ${LISTING_STATUS_STYLE[l.status] ?? ""}`}>{t(`opt.status.${l.status}` as never)}</span></td>
                    <td>{l.views}</td>
                    <td className="text-emerald-600">{timeAgo(l.createdAt, locale)}</td>
                    <td>
                      {["ACTIVE", "PENDING", "REJECTED"].includes(l.status) && (
                        <form action={archiveListingAction.bind(null, l.id)}>
                          <button className="btn-outline btn-sm">{t("dash.archive")}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Offers received */}
      {offersReceived.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-4">{t("dash.offersReceived")}</h2>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>{t("dash.thVehicle")}</th><th>{t("dash.thBuyer")}</th><th>{t("dash.thOffer")}</th><th>{t("dash.thStatus")}</th><th>{t("dash.thRespond")}</th></tr>
              </thead>
              <tbody>
                {offersReceived.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/listings/${o.listingId}`} className="font-semibold text-brand-700 hover:underline">
                        {o.listing.title}
                      </Link>
                      <p className="text-xs text-emerald-500">{t("dash.asking", { amount: formatMoney(o.listing.price, currency) })}</p>
                    </td>
                    <td>{o.buyer.name}</td>
                    <td>
                      <p className="font-bold">{formatMoney(o.amount, currency)}</p>
                      {o.counterAmount && <p className="text-xs text-brand-600">{t("dash.countered", { amount: formatMoney(o.counterAmount, currency) })}</p>}
                      {o.message && <p className="text-xs text-emerald-600">“{o.message}”</p>}
                    </td>
                    <td><span className={`badge ${OFFER_STATUS_STYLE[o.status] ?? ""}`}>{t(`opt.offer.${o.status}` as never)}</span></td>
                    <td>
                      {o.status === "PENDING" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={respondOfferAction.bind(null, o.id)}>
                            <input type="hidden" name="decision" value="accept" />
                            <button className="btn-success btn-sm">{t("dash.accept")}</button>
                          </form>
                          <form action={respondOfferAction.bind(null, o.id)}>
                            <input type="hidden" name="decision" value="reject" />
                            <button className="btn-danger btn-sm">{t("dash.reject")}</button>
                          </form>
                          <form action={respondOfferAction.bind(null, o.id)} className="flex items-center gap-1">
                            <input type="hidden" name="decision" value="counter" />
                            <input name="counterAmount" type="number" min={100} placeholder={t("dash.counterPh")} className="input w-28 py-1.5 text-xs" required />
                            <button className="btn-outline btn-sm">{t("dash.send")}</button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Offers sent */}
      {offersSent.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-4">{t("dash.myOffers")}</h2>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>{t("dash.thVehicle")}</th><th>{t("dash.thMyOffer")}</th><th>{t("dash.thStatus")}</th><th>{t("dash.thActions")}</th></tr>
              </thead>
              <tbody>
                {offersSent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/listings/${o.listingId}`} className="font-semibold text-brand-700 hover:underline">
                        {o.listing.title}
                      </Link>
                    </td>
                    <td>
                      <p className="font-bold">{formatMoney(o.amount, currency)}</p>
                      {o.counterAmount && (
                        <p className="text-xs text-brand-600">{t("dash.sellerCountered", { amount: formatMoney(o.counterAmount, currency) })}</p>
                      )}
                    </td>
                    <td><span className={`badge ${OFFER_STATUS_STYLE[o.status] ?? ""}`}>{t(`opt.offer.${o.status}` as never)}</span></td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {o.status === "COUNTERED" && (
                          <form action={buyerOfferAction.bind(null, o.id)}>
                            <input type="hidden" name="decision" value="accept-counter" />
                            <button className="btn-success btn-sm">{t("dash.acceptCounter")}</button>
                          </form>
                        )}
                        {["PENDING", "COUNTERED"].includes(o.status) && (
                          <form action={buyerOfferAction.bind(null, o.id)}>
                            <input type="hidden" name="decision" value="withdraw" />
                            <button className="btn-outline btn-sm">{t("dash.withdraw")}</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Test drive requests (seller) */}
      {testDrivesForMe.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-4">{t("dash.testDrives")}</h2>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>{t("dash.thVehicle")}</th><th>{t("dash.thBuyer")}</th><th>{t("dash.thRequestedTime")}</th><th>{t("dash.thStatus")}</th><th></th></tr></thead>
              <tbody>
                {testDrivesForMe.map((td) => (
                  <tr key={td.id}>
                    <td>{td.listing.title}</td>
                    <td>{td.buyer.name}</td>
                    <td>{td.requestedAt.toLocaleString(locale === "ar" ? "ar" : "en-US")}</td>
                    <td><span className="badge border-emerald-100 bg-emerald-50 text-emerald-600">{t(`opt.td.${td.status}` as never)}</span></td>
                    <td>
                      {td.status === "REQUESTED" && (
                        <div className="flex gap-2">
                          <form action={respondTestDriveAction.bind(null, td.id)}>
                            <input type="hidden" name="decision" value="confirm" />
                            <button className="btn-success btn-sm">{t("dash.confirm")}</button>
                          </form>
                          <form action={respondTestDriveAction.bind(null, td.id)}>
                            <input type="hidden" name="decision" value="decline" />
                            <button className="btn-outline btn-sm">{t("dash.decline")}</button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Messages */}
      <section className="mt-10">
        <h2 className="section-title mb-4">{t("dash.messages")}</h2>
        {conversations.length === 0 ? (
          <div className="card p-10 text-center text-sm text-emerald-600">{t("dash.noMessages")}</div>
        ) : (
          <div className="card divide-y divide-emerald-50">
            {conversations.map((c) => {
              const other = c.buyerId === user.id ? c.listing.seller : c.buyer;
              const last = c.messages[0];
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/messages/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-emerald-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {other.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-emerald-950">{other.name} · <span className="font-normal text-emerald-600">{c.listing.title}</span></p>
                    {last && <p className="truncate text-sm text-emerald-600">{last.body}</p>}
                  </div>
                  {last && <span className="shrink-0 text-xs text-emerald-500">{timeAgo(last.createdAt, locale)}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-4">{t("dash.favorites")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((f) => <ListingCard key={f.listingId} listing={f.listing} currency={currency} />)}
          </div>
        </section>
      )}

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-4">{t("dash.savedSearches")}</h2>
          <div className="card divide-y divide-emerald-50">
            {savedSearches.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <Link href={`/listings?${s.query}`} className="font-semibold text-brand-700 hover:underline">
                  {s.name}
                </Link>
                <form action={deleteSavedSearchAction.bind(null, s.id)}>
                  <button className="btn-outline btn-sm">{t("dash.delete")}</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
