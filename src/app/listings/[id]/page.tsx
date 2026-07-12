import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { formatMoney, getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { formatMileage, parseJsonArray, timeAgo } from "@/lib/utils";
import Gallery from "@/components/Gallery";
import ListingCard from "@/components/ListingCard";
import { toggleFavoriteAction, makeOfferAction, contactSellerAction, requestTestDriveAction } from "@/app/actions/engagement";
import { requestInspectionAction } from "@/app/actions/listings";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { created?: string; offer?: string; testdrive?: string; error?: string };
};

export async function generateMetadata({ params }: Props) {
  const listing = await db.listing.findUnique({ where: { id: params.id }, select: { title: true } });
  return { title: listing?.title ?? "Listing" };
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  ARCHIVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SOLD: "bg-emerald-950 text-white border-emerald-950",
};

export default async function ListingDetailPage({ params, searchParams }: Props) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const locale = getLocale();
  const t = getT();

  const listing = await db.listing.findUnique({
    where: { id: params.id },
    include: { seller: true, inspection: true },
  });
  if (!listing) notFound();

  const isOwner = user?.id === listing.sellerId;
  const staff = user ? isStaff(user.role) : false;
  const publiclyVisible = listing.status === "ACTIVE" || listing.status === "SOLD";
  if (!publiclyVisible && !isOwner && !staff) notFound();

  // Count a view for live listings viewed by non-owners
  if (listing.status === "ACTIVE" && !isOwner) {
    await db.listing.updateMany({ where: { id: listing.id }, data: { views: { increment: 1 } } });
  }

  const [favorite, similar] = await Promise.all([
    user
      ? db.favorite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: listing.id } } })
      : null,
    db.listing.findMany({
      where: {
        id: { not: listing.id },
        status: "ACTIVE",
        OR: [{ make: listing.make }, { bodyStyle: listing.bodyStyle }],
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const images = parseJsonArray(listing.images);
  const features = parseJsonArray(listing.features);
  const currency = settings.currency;
  const statusBadgeStyle = STATUS_BADGE_STYLES[listing.status];

  const specs: [string, string][] = [
    [t("spec.year"), String(listing.year)],
    [t("spec.mileage"), formatMileage(listing.mileage, locale)],
    [t("spec.bodyStyle"), t(`opt.bodyStyle.${listing.bodyStyle}` as never)],
    [t("spec.fuelType"), t(`opt.fuelType.${listing.fuelType}` as never)],
    [t("spec.transmission"), t(`opt.transmission.${listing.transmission}` as never)],
    [t("spec.drivetrain"), t(`opt.drivetrain.${listing.drivetrain}` as never)],
    [t("spec.engine"), listing.engine ?? "—"],
    [t("spec.exteriorColor"), listing.exteriorColor],
    [t("spec.interiorColor"), listing.interiorColor ?? "—"],
    [t("spec.condition"), t(`opt.condition.${listing.condition}` as never)],
    [t("spec.accidents"), listing.accidentFree ? t("detail.noneReported") : t("detail.reported")],
    [t("spec.owners"), String(listing.ownerCount)],
    [t("spec.vin"), listing.vin ?? t("detail.notProvided")],
    [t("spec.location"), `${listing.city}, ${listing.state}`],
  ];

  return (
    <div className="container-page py-8">
      {/* Flash banners */}
      {searchParams.created && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t("detail.flashCreated")}
        </div>
      )}
      {searchParams.offer === "sent" && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t("detail.flashOffer")}
        </div>
      )}
      {searchParams.testdrive && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t("detail.flashTestDrive")}
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}
      {listing.status === "REJECTED" && listing.rejectReason && (isOwner || staff) && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {t("detail.rejectedBy")} {listing.rejectReason}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div>
          <Gallery images={images} title={listing.title} locale={locale} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {statusBadgeStyle && (
              <span className={`badge ${statusBadgeStyle}`}>{t(`opt.status.${listing.status}` as never)}</span>
            )}
            {listing.tier !== "FREE" && (
              <span className="badge border-brand-200 bg-brand-50 text-brand-700">
                {listing.tier === "ULTIMATE" ? t("detail.ultimateListing") : t("detail.premiumListing")}
              </span>
            )}
            {listing.inspection?.status === "COMPLETED" && (
              <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                {t("detail.inspectedBadge")} · {listing.inspection.score}/100
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">{listing.title}</h1>
          <p className="mt-1 text-sm text-emerald-600">
            {t("detail.listed", { time: timeAgo(listing.createdAt, locale), views: listing.views.toLocaleString() })}
          </p>

          {/* Specs */}
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-bold text-emerald-950">{t("detail.specs")}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {specs.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-500">{k}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-emerald-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Features */}
          {features.length > 0 && (
            <section className="card mt-6 p-6">
              <h2 className="text-lg font-bold text-emerald-950">{t("detail.features")}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {features.map((f) => (
                  <span key={f} className="badge border-emerald-100 bg-emerald-50 text-emerald-800">
                    {t(`opt.feature.${f}` as never)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Description */}
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-bold text-emerald-950">{t("detail.sellerDesc")}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-emerald-900">
              {listing.description}
            </p>
          </section>

          {/* Inspection */}
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-bold text-emerald-950">{t("detail.inspection")}</h2>
            {listing.inspection ? (
              <div className="mt-3 text-sm">
                {listing.inspection.status === "COMPLETED" ? (
                  <>
                    <p className="flex items-center gap-2">
                      <span className="text-3xl font-black text-brand-600">{listing.inspection.score}</span>
                      <span className="text-emerald-600">
                        {t("detail.inspScoreSuffix", {
                          type: listing.inspection.type.toLowerCase(),
                          time: listing.inspection.completedAt ? timeAgo(listing.inspection.completedAt, locale) : "",
                        })}
                      </span>
                    </p>
                    {listing.inspection.summary && (
                      <p className="mt-2 whitespace-pre-line text-emerald-900">{listing.inspection.summary}</p>
                    )}
                  </>
                ) : (
                  <p className="text-emerald-600">{t("detail.inspPending")}</p>
                )}
              </div>
            ) : isOwner ? (
              <form action={requestInspectionAction.bind(null, listing.id)} className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="label">{t("detail.inspRequestType")}</label>
                  <select name="type" className="input w-52">
                    <option value="MOBILE">{t("detail.inspMobile")}</option>
                    <option value="VIRTUAL">{t("detail.inspVirtual")}</option>
                    <option value="CENTER">{t("detail.inspCenter")}</option>
                  </select>
                </div>
                <button className="btn-outline">{t("detail.inspRequestBtn")}</button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-emerald-600">{t("detail.inspNone")}</p>
            )}
          </section>
        </div>

        {/* Right column — purchase panel */}
        <aside className="space-y-4">
          <div className="card sticky top-20 p-6">
            <p className="text-3xl font-black text-emerald-950">{formatMoney(listing.price, currency)}</p>
            {listing.status === "SOLD" && listing.soldPrice && (
              <p className="mt-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
                {t("detail.soldFor", { amount: formatMoney(listing.soldPrice, currency) })}
              </p>
            )}

            {/* Seller card */}
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {listing.seller.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-emerald-950">
                  {listing.seller.role === "DEALER" && listing.seller.dealershipName
                    ? listing.seller.dealershipName
                    : listing.seller.name}
                </p>
                <p className="text-xs text-emerald-600">
                  {t(`opt.role.${listing.seller.role}` as never)}
                  {listing.seller.verified && ` · ${t("detail.verified")}`}
                </p>
              </div>
            </div>

            {/* Actions */}
            {user && !isOwner && listing.status === "ACTIVE" && (
              <div className="mt-5 space-y-5">
                <form action={toggleFavoriteAction.bind(null, listing.id, `/listings/${listing.id}`)}>
                  <button className={favorite ? "btn-outline w-full border-rose-200 text-rose-600" : "btn-outline w-full"}>
                    {favorite ? t("detail.removeFav") : t("detail.saveFav")}
                  </button>
                </form>

                <form action={makeOfferAction.bind(null, listing.id)} className="space-y-2">
                  <label className="label">{t("detail.makeOffer")}</label>
                  <input name="amount" type="number" min={100} required className="input" placeholder={t("detail.offerPh", { amount: Math.round(listing.price * 0.95) })} />
                  <textarea name="message" rows={2} className="input" placeholder={t("detail.offerNote")} />
                  <button className="btn-primary w-full">{t("detail.submitOffer")}</button>
                </form>

                <form action={contactSellerAction.bind(null, listing.id)} className="space-y-2">
                  <label className="label">{t("detail.messageSeller")}</label>
                  <textarea name="body" rows={2} required className="input" placeholder={t("detail.messagePh")} />
                  <button className="btn-outline w-full">{t("detail.sendMessage")}</button>
                </form>

                <form action={requestTestDriveAction.bind(null, listing.id)} className="space-y-2">
                  <label className="label">{t("detail.testDrive")}</label>
                  <input name="requestedAt" type="datetime-local" required className="input" />
                  <button className="btn-outline w-full">{t("detail.testDriveBtn")}</button>
                </form>
              </div>
            )}

            {!user && listing.status === "ACTIVE" && (
              <div className="mt-5 space-y-2">
                <Link href={`/login?next=/listings/${listing.id}`} className="btn-primary w-full">
                  {t("detail.signInOffer")}
                </Link>
                <p className="text-center text-xs text-emerald-500">{t("detail.signInSub")}</p>
              </div>
            )}

            {isOwner && (
              <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                {t("detail.ownListingPrefix")}{" "}
                <Link href="/dashboard" className="font-semibold text-brand-600 hover:underline">
                  {t("detail.ownListingLink")}
                </Link>.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title mb-4">{t("detail.similar")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => <ListingCard key={l.id} listing={l} currency={currency} />)}
          </div>
        </section>
      )}
    </div>
  );
}
