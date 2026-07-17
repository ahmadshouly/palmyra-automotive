import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { formatMoney, getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { formatMileage, parseJsonArray, timeAgo, whatsappLink } from "@/lib/utils";
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

  const displayTitle = locale === "ar" && listing.titleAr ? listing.titleAr : listing.title;
  const displayDescription =
    locale === "ar" && listing.descriptionAr ? listing.descriptionAr : listing.description;
  const waUrl = whatsappLink(settings.whatsappNumber, t("detail.whatsappMsg", { title: displayTitle }));

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
          <Gallery images={images} title={displayTitle} locale={locale} />

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

          <h1 className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">{displayTitle}</h1>
          <p className="mt-2 text-2xl font-black text-brand-700">{formatMoney(listing.price, currency)}</p>
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
              {displayDescription}
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
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 font-semibold text-white transition hover:brightness-95"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t("detail.whatsapp")}
              </a>
            )}
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
            {staff && (
              <Link href={`/listings/${listing.id}/edit`} className="btn-outline mt-4 w-full">
                {t("common.edit")}
              </Link>
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
