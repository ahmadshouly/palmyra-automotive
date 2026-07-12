import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Model-year table for offline fallback decoding (VIN position 10).
const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";
function yearFromCode(code: string): number | null {
  const idx = YEAR_CODES.indexOf(code.toUpperCase());
  if (idx === -1) return null;
  const base = 2010 + idx; // 2010-2039 window
  return base > new Date().getFullYear() + 1 ? base - 30 : base;
}

/**
 * VIN decoder — uses the free NHTSA vPIC API with a graceful offline fallback.
 * GET /api/vin/1HGCM82633A004352
 */
export async function GET(_req: NextRequest, { params }: { params: { vin: string } }) {
  const vin = params.vin.toUpperCase().trim();
  if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin)) {
    return NextResponse.json({ error: "Invalid VIN format" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
      { signal: controller.signal, next: { revalidate: 86400 } }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`NHTSA responded ${res.status}`);

    const data = await res.json();
    const r = data?.Results?.[0] ?? {};
    const clean = (v: unknown) => (typeof v === "string" && v.trim() && v !== "Not Applicable" ? v.trim() : null);

    return NextResponse.json({
      source: "nhtsa",
      vin,
      make: clean(r.Make),
      model: clean(r.Model),
      year: clean(r.ModelYear) ? Number(r.ModelYear) : yearFromCode(vin.charAt(9)),
      trim: clean(r.Trim),
      bodyStyle: clean(r.BodyClass),
      engine: clean(r.EngineModel) ?? clean(r.EngineConfiguration),
      cylinders: clean(r.EngineCylinders),
      fuelType: clean(r.FuelTypePrimary),
      transmission: clean(r.TransmissionStyle),
      drivetrain: clean(r.DriveType),
      plant: clean(r.PlantCountry),
    });
  } catch {
    return NextResponse.json({
      source: "offline",
      vin,
      make: null,
      model: null,
      year: yearFromCode(vin.charAt(9)),
      note: "NHTSA service unreachable — only the model year could be inferred locally.",
    });
  }
}
