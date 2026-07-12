import { db } from "@/lib/db";

export type PriceConfidence = {
  label: "Great Deal" | "Good Deal" | "Fair Price" | "High Price" | "No Data";
  delta: number; // percent vs market average (negative = below market)
  marketAvg: number | null;
  sample: number;
};

/**
 * Market-based price confidence score: compares a listing's price against
 * comparable vehicles (same make + model, year within ±2) currently on the
 * platform or recently sold.
 */
export async function getPriceConfidence(listing: {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
}): Promise<PriceConfidence> {
  const comps = await db.listing.findMany({
    where: {
      id: { not: listing.id },
      make: listing.make,
      model: listing.model,
      year: { gte: listing.year - 2, lte: listing.year + 2 },
      status: { in: ["ACTIVE", "SOLD"] },
    },
    select: { price: true, soldPrice: true },
    take: 50,
  });

  if (comps.length === 0) return { label: "No Data", delta: 0, marketAvg: null, sample: 0 };

  const values = comps.map((c) => c.soldPrice ?? c.price);
  const marketAvg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const delta = Math.round(((listing.price - marketAvg) / marketAvg) * 100);

  let label: PriceConfidence["label"] = "Fair Price";
  if (delta <= -8) label = "Great Deal";
  else if (delta <= -3) label = "Good Deal";
  else if (delta >= 8) label = "High Price";

  return { label, delta, marketAvg, sample: comps.length };
}

export function confidenceStyle(label: PriceConfidence["label"]) {
  switch (label) {
    case "Great Deal":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Good Deal":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Fair Price":
      return "bg-brand-100 text-brand-800 border-brand-200";
    case "High Price":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-emerald-100 text-emerald-600 border-emerald-200";
  }
}

/** Simple monthly payment estimator (defaults: 60 months, 7.5% APR, 10% down). */
export function estimateMonthly(price: number, months = 60, apr = 7.5, downPct = 10) {
  const principal = price * (1 - downPct / 100);
  const r = apr / 100 / 12;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}
