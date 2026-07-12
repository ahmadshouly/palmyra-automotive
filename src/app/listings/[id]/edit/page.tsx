import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n";
import { updateListingAction } from "@/app/actions/listings";
import SellForm, { type ListingInitial } from "@/components/SellForm";

export async function generateMetadata() {
  return { title: getT()("meta.editListing") };
}

export const dynamic = "force-dynamic";

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  // Only administrators may edit listings.
  await requireUser(["ADMIN"]);
  const listing = await db.listing.findUnique({ where: { id: params.id } });
  if (!listing) notFound();

  const locale = getLocale();
  const t = getT();

  const initial: ListingInitial = {
    make: listing.make,
    model: listing.model,
    year: listing.year,
    mileage: listing.mileage,
    bodyStyle: listing.bodyStyle,
    fuelType: listing.fuelType,
    transmission: listing.transmission,
    drivetrain: listing.drivetrain,
    engine: listing.engine,
    exteriorColor: listing.exteriorColor,
    interiorColor: listing.interiorColor,
    condition: listing.condition,
    ownerCount: listing.ownerCount,
    accidentFree: listing.accidentFree,
    title: listing.title,
    description: listing.description,
    vin: listing.vin,
    price: listing.price,
    city: listing.city,
    state: listing.state,
    tier: listing.tier,
    features: parseStringArray(listing.features),
    images: parseStringArray(listing.images),
  };

  return (
    <div className="container-page max-w-4xl py-10">
      <h1 className="text-3xl font-black text-emerald-950">{t("sell.editTitle")}</h1>
      <p className="mt-2 text-emerald-600">{t("sell.editSub")}</p>
      <div className="mt-8">
        <SellForm
          error={searchParams.error}
          locale={locale}
          initial={initial}
          action={updateListingAction.bind(null, listing.id)}
        />
      </div>
    </div>
  );
}
