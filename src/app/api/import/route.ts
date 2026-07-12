import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FEATURE_OPTIONS, POPULAR_MAKES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SOURCE_HOSTS = new Set(["sellcarintl.com", "www.sellcarintl.com"]);
const CAR_INFO_API = "https://www.sellcarintl.com/api/service/v1.0/getCarInfo.do";
const REF_RE = /([A-Z]{1,4}\d{6}-\d{5,9})/;
const MAX_IMAGES = 12;
const KM_TO_MI = 0.621371;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (/^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

function mapMake(brand: string) {
  const canonical = POPULAR_MAKES.find((m) => m.toLowerCase() === brand.toLowerCase());
  return canonical ?? titleCase(brand);
}

function mapFuel(value: string) {
  const v = value.toLowerCase();
  if (v.includes("plug")) return "Plug-in Hybrid";
  if (v.includes("hybrid")) return "Hybrid";
  if (v.includes("electric") || v.includes("ev")) return "Electric";
  if (v.includes("diesel")) return "Diesel";
  if (v.includes("lpg") || v.includes("lpi")) return "LPG";
  return "Gasoline";
}

function mapTransmission(value: string) {
  const v = value.toLowerCase();
  if (v.includes("m/t") || v.includes("manual")) return "Manual";
  if (v.includes("cvt")) return "CVT";
  if (v.includes("dct") || v.includes("dual")) return "Dual-clutch";
  return "Automatic";
}

function mapBodyStyle(value: string) {
  const v = value.toLowerCase();
  if (/suv|rv\b|sport utility/.test(v)) return "SUV";
  if (/truck|pick-?up/.test(v)) return "Truck";
  if (/van|minivan/.test(v)) return "Van";
  if (/coupe/.test(v)) return "Coupe";
  if (/convertible|cabrio|roadster/.test(v)) return "Convertible";
  if (/wagon|estate/.test(v)) return "Wagon";
  if (/hatch|compact car|small car|city car/.test(v)) return "Hatchback";
  return "Sedan";
}

function mapDrivetrain(value: string | null | undefined) {
  const v = (value ?? "").toUpperCase();
  if (v.includes("AWD") || v.includes("ALL")) return "AWD";
  if (v.includes("4WD") || v.includes("4X4")) return "4WD";
  if (v.includes("RWD") || v.includes("REAR")) return "RWD";
  if (v.includes("FWD") || v.includes("FRONT")) return "FWD";
  return null;
}

function conditionFromMiles(miles: number) {
  if (miles < 15_000) return "LIKE_NEW";
  if (miles < 50_000) return "EXCELLENT";
  if (miles < 90_000) return "GOOD";
  return "FAIR";
}

// Maps source option names (applicable_yn === "Y") onto our feature checklist.
const FEATURE_RULES: [RegExp, (typeof FEATURE_OPTIONS)[number]][] = [
  [/panoramic sunroof/i, "Panoramic Roof"],
  [/sunroof|moonroof/i, "Sunroof / Moonroof"],
  [/leather seats/i, "Leather Seats"],
  [/navigation/i, "Navigation System"],
  [/rear\s?view camera|backup camera/i, "Backup Camera"],
  [/blind spot/i, "Blind Spot Monitor"],
  [/adaptive cruise|smart cruise/i, "Adaptive Cruise Control"],
  [/lane departure|lane keep/i, "Lane Keep Assist"],
  [/heated .*seats?/i, "Heated Seats"],
  [/ventilated .*seat/i, "Ventilated Seats"],
  [/around view|360/i, "360° Camera"],
  [/smart key|push button start|keyless/i, "Keyless Entry"],
  [/detection sensors|parking sensor/i, "Parking Sensors"],
  [/head-?up display/i, "Head-Up Display"],
  [/wireless charging/i, "Wireless Charging"],
  [/carplay|android auto/i, "Apple CarPlay / Android Auto"],
  [/premium (audio|sound)|harman|bose|burmester|jbl|krell|lexicon/i, "Premium Audio"],
  [/remote start/i, "Remote Start"],
  [/tow(ing)? (package|hitch)/i, "Tow Package"],
  [/third row|7-?seater|9-?seater/i, "Third Row Seating"],
];

function extractFeatures(optionsInfo: unknown): string[] {
  const found = new Set<string>();
  if (Array.isArray(optionsInfo)) {
    for (const group of optionsInfo) {
      const list = (group as { car_option_list?: unknown }).car_option_list;
      if (!Array.isArray(list)) continue;
      for (const opt of list) {
        const { car_option_name: name, applicable_yn: yn } = opt as {
          car_option_name?: string;
          applicable_yn?: string;
        };
        if (yn !== "Y" || !name) continue;
        for (const [re, feature] of FEATURE_RULES) {
          if (re.test(name)) {
            found.add(feature);
            break;
          }
        }
      }
    }
  }
  return Array.from(found);
}

/**
 * Imports a vehicle listing from a sellcarintl.com URL (or reference number).
 * Admin-only. No arbitrary URL is ever fetched — only the reference ID is
 * extracted and sent to the site's fixed, public vehicle API (no SSRF surface).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const input = (req.nextUrl.searchParams.get("url") ?? "").trim();
  if (!input) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // If a full URL was pasted, it must belong to the supported source site.
  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input);
      if (!SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) {
        return NextResponse.json({ error: "Only sellcarintl.com URLs are supported" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  const ref = REF_RE.exec(input.toUpperCase())?.[1];
  if (!ref) {
    return NextResponse.json(
      { error: "Could not find a listing reference (e.g. PT260703-0011402) in the URL" },
      { status: 400 }
    );
  }

  // Duplicate detection: block/hint if this source ref or VIN is already listed.
  const existingByRef = await db.listing.findFirst({
    where: { sourceRef: ref, status: { in: ["PENDING", "ACTIVE", "SOLD"] } },
    select: { id: true, title: true, status: true },
  });
  if (existingByRef) {
    return NextResponse.json(
      {
        error: "This vehicle has already been imported and listed.",
        duplicate: {
          by: "sourceRef",
          listingId: existingByRef.id,
          title: existingByRef.title,
          status: existingByRef.status,
        },
      },
      { status: 409 }
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(CAR_INFO_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; listing-importer)",
      },
      body: JSON.stringify({ car_goods_unique_id: ref }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Source responded ${res.status}`);

    const payload = await res.json();
    const d = payload?.data;
    const overview = d?.car_overview;
    if (!overview?.brand) {
      return NextResponse.json({ error: "Vehicle not found at source" }, { status: 404 });
    }

    const info = d.information ?? {};
    const km = Number(d.car_mileage ?? overview.mileage ?? 0);
    const miles = Math.max(0, Math.round(km * KM_TO_MI));
    const year = Number(d.car_year ?? overview.year) || new Date().getFullYear();
    const price = Number(d.car_price ?? d.car_original_price) || 0;
    const cc = Number(overview.cc) || 0;
    const make = mapMake(String(overview.brand));
    const model = titleCase(String(overview.model ?? ""));
    const grade = String(overview.grade ?? d.car_sub_name ?? "").trim();
    const images: string[] = Array.isArray(d.car_images?.car_imgs)
      ? d.car_images.car_imgs.filter((u: unknown) => typeof u === "string").slice(0, MAX_IMAGES)
      : [];

    const engineParts = [
      cc > 0 ? `${(cc / 1000).toFixed(1)}L` : null,
      info.engine ? `(${info.engine})` : null,
    ].filter(Boolean);

    const vin = typeof info.vin === "string" && info.vin.length >= 11 ? info.vin.toUpperCase() : null;

    // Duplicate detection by VIN as a second line of defense.
    if (vin) {
      const existingByVin = await db.listing.findFirst({
        where: { vin, status: { in: ["PENDING", "ACTIVE", "SOLD"] } },
        select: { id: true, title: true, status: true },
      });
      if (existingByVin) {
        return NextResponse.json(
          {
            error: "A listing with this VIN already exists.",
            duplicate: {
              by: "vin",
              listingId: existingByVin.id,
              title: existingByVin.title,
              status: existingByVin.status,
            },
          },
          { status: 409 }
        );
      }
    }

    const description = [
      `${year} ${make} ${model}${grade ? ` ${grade}` : ""} — imported from SellCar International (Ref ${ref}).`,
      km > 0 ? `Odometer: ${km.toLocaleString()} km (~${miles.toLocaleString()} mi).` : null,
      overview.r_year_month ? `First registered ${overview.r_year_month}.` : null,
      cc > 0 ? `Displacement ${cc.toLocaleString()} cc.` : null,
      info.warranty ? `Warranty: ${info.warranty}.` : null,
      `Source: https://www.sellcarintl.com/buy-now/detail/${ref}`,
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      source: "sellcarintl",
      ref,
      title: `${year} ${make} ${model}${grade ? ` ${grade}` : ""}`.slice(0, 120),
      make,
      model,
      year,
      mileage: miles,
      price,
      fuelType: mapFuel(String(d.car_fuel ?? overview.fuel ?? "")),
      transmission: mapTransmission(String(d.car_transmission ?? overview.transmission ?? "")),
      drivetrain: mapDrivetrain(overview.drive),
      bodyStyle: mapBodyStyle(String(overview.body_type ?? "")),
      exteriorColor: overview.color ? titleCase(String(overview.color)) : null,
      engine: engineParts.join(" ") || null,
      vin,
      condition: conditionFromMiles(miles),
      description,
      features: extractFeatures(d.car_options_info),
      images,
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach sellcarintl.com" }, { status: 502 });
  }
}
