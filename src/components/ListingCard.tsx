import Link from "next/link";
import type { Listing } from "@prisma/client";
import { formatMoney } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { formatMileage, parseJsonArray, timeAgo } from "@/lib/utils";

const TIER_STYLES: Record<string, string> = {
  PREMIUM: "bg-brand-600 text-white",
  ULTIMATE: "bg-amber-500 text-emerald-950",
};

export default async function ListingCard({
  listing,
  currency,
}: {
  listing: Listing;
  currency: string;
}) {
  const locale = getLocale();
  const t = getT();
  const images = parseJsonArray(listing.images);
  const displayTitle = locale === "ar" && listing.titleAr ? listing.titleAr : listing.title;
  const cover = images[0] ?? `/api/placeholder?label=${encodeURIComponent(displayTitle)}&seed=${listing.id}`;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[8/5] overflow-hidden bg-emerald-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {listing.tier !== "FREE" && (
          <span className={`absolute start-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${TIER_STYLES[listing.tier] ?? ""}`}>
            {listing.tier === "ULTIMATE" ? t("card.featuredInspected") : t("card.featured")}
          </span>
        )}
        {listing.status === "SOLD" && (
          <span className="absolute end-3 top-3 rounded-full bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {t("card.sold")}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-emerald-950 group-hover:text-brand-700">
            {displayTitle}
          </h3>
        </div>
        <p className="mt-1 text-lg font-bold text-emerald-950">{formatMoney(listing.price, currency)}</p>
        <p className="mt-1 text-xs text-emerald-600">
          {listing.year} · {formatMileage(listing.mileage, locale)} ·{" "}
          {t(`opt.fuelType.${listing.fuelType}` as never)} ·{" "}
          {t(`opt.transmission.${listing.transmission}` as never)}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-emerald-500">
          <span>
            {listing.city}, {listing.state}
          </span>
          <span>{timeAgo(listing.createdAt, locale)}</span>
        </div>
      </div>
    </Link>
  );
}
