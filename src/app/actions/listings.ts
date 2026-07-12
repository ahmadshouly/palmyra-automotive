"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, isStaff, requireUser } from "@/lib/auth";
import {
  BODY_STYLES,
  CONDITIONS,
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
} from "@/lib/constants";
import { placeholderImage } from "@/lib/utils";

const MAX_PHOTOS = 30;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

// Remote images may only be pulled from the approved import source.
const IMPORT_IMAGE_HOSTS = new Set([
  "image.sellcarintl.com",
  "image-resize.sellcarintl.com",
  "www.sellcarintl.com",
]);
const MAX_IMPORT_IMAGES = 12;

async function savePhotos(listingId: string, files: File[]): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "uploads", "listings", listingId);
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  let i = 0;
  for (const file of files.slice(0, MAX_PHOTOS)) {
    const ext = EXT[file.type];
    if (!ext || file.size === 0 || file.size > MAX_PHOTO_BYTES) continue;
    const name = `photo-${++i}${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    urls.push(`/uploads/listings/${listingId}/${name}`);
  }
  return urls;
}

/** Downloads imported source photos (allow-listed hosts only) into local uploads. */
async function saveImportedPhotos(listingId: string, remoteUrls: string[]): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "uploads", "listings", listingId);
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  let i = 0;
  for (const raw of remoteUrls.slice(0, MAX_IMPORT_IMAGES)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || !IMPORT_IMAGE_HOSTS.has(url.hostname.toLowerCase())) continue;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) continue;
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = EXT[type] ?? (url.pathname.toLowerCase().endsWith(".jpg") || url.pathname.toLowerCase().endsWith(".jpeg") ? ".jpg" : null);
      if (!ext) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_PHOTO_BYTES) continue;
      const name = `photo-${++i}${ext}`;
      await writeFile(path.join(dir, name), buffer);
      urls.push(`/uploads/listings/${listingId}/${name}`);
    } catch {
      // skip failed downloads, keep the rest
    }
  }
  return urls;
}

export async function createListingAction(formData: FormData) {
  // Only administrators can add car listings.
  const user = await requireUser(["ADMIN"]);

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Number.parseInt(str(k).replace(/[^\d]/g, ""), 10);

  const title = str("title");
  const description = str("description");
  const make = str("make");
  const model = str("model");
  const year = num("year");
  const price = num("price");
  const mileage = num("mileage");
  const bodyStyle = str("bodyStyle");
  const fuelType = str("fuelType");
  const transmission = str("transmission");
  const drivetrain = str("drivetrain");
  const condition = str("condition");
  const exteriorColor = str("exteriorColor");
  const interiorColor = str("interiorColor") || null;
  const engine = str("engine") || null;
  const vin = str("vin").toUpperCase() || null;
  const city = str("city");
  const state = str("state");
  const tier = ["FREE", "PREMIUM", "ULTIMATE"].includes(str("tier")) ? str("tier") : "FREE";
  const features = formData.getAll("features").map(String).slice(0, 40);
  const accidentFree = formData.get("accidentFree") === "on";
  const ownerCount = Math.min(Math.max(num("ownerCount") || 1, 1), 15);
  const sourceRef = str("sourceRef") || null;
  const sourceUrl = str("sourceUrl") || null;

  const fail = (msg: string) => redirect(`/sell?error=${encodeURIComponent(msg)}`);

  if (title.length < 5) fail("Title must be at least 5 characters.");
  if (description.length < 20) fail("Description must be at least 20 characters.");
  if (!make || !model) fail("Make and model are required.");
  if (!Number.isFinite(year) || year < 1950 || year > new Date().getFullYear() + 1) fail("Enter a valid year.");
  if (!Number.isFinite(price) || price < 100 || price > 10_000_000) fail("Enter a valid price.");
  if (!Number.isFinite(mileage) || mileage < 0 || mileage > 1_500_000) fail("Enter a valid mileage.");
  if (!(BODY_STYLES as readonly string[]).includes(bodyStyle)) fail("Select a body style.");
  if (!(FUEL_TYPES as readonly string[]).includes(fuelType)) fail("Select a fuel type.");
  if (!(TRANSMISSIONS as readonly string[]).includes(transmission)) fail("Select a transmission.");
  if (!(DRIVETRAINS as readonly string[]).includes(drivetrain)) fail("Select a drivetrain.");
  if (!(CONDITIONS as readonly string[]).includes(condition)) fail("Select a condition.");
  if (!exteriorColor) fail("Exterior color is required.");
  if (!city || !state) fail("Location (city and state) is required.");
  if (vin && !/^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin)) fail("VIN must be 11-17 characters (no I, O, Q).");

  // Duplicate VIN detection — one live listing per VIN.
  if (vin) {
    const dup = await db.listing.findFirst({
      where: { vin, status: { in: ["PENDING", "ACTIVE"] } },
    });
    if (dup) fail("A live listing with this VIN already exists (duplicate detection).");
  }

  const listing = await db.listing.create({
    data: {
      sellerId: user.id,
      title,
      description,
      status: "ACTIVE", // admin-created listings are published immediately
      tier,
      price,
      vin,
      make,
      model,
      year,
      mileage,
      bodyStyle,
      fuelType,
      transmission,
      drivetrain,
      exteriorColor,
      interiorColor,
      engine,
      condition,
      accidentFree,
      ownerCount,
      city,
      state,
      features: JSON.stringify(features),
      images: "[]",
      sourceRef,
      sourceUrl,
    },
  });

  const photos = (formData.getAll("photos") as File[]).filter((f) => f instanceof File);
  let urls = await savePhotos(listing.id, photos);

  // No manual uploads — fall back to photos imported from a source listing URL.
  if (urls.length === 0) {
    try {
      const imported = JSON.parse(String(formData.get("importImages") ?? "[]"));
      if (Array.isArray(imported) && imported.length > 0) {
        urls = await saveImportedPhotos(listing.id, imported.filter((u) => typeof u === "string"));
      }
    } catch {
      // ignore malformed import payload
    }
  }

  if (urls.length === 0) {
    const label = `${year} ${make} ${model}`;
    urls = ["front", "side", "interior"].map((angle) => placeholderImage(label, `${listing.id}-${angle}`));
  }
  await db.listing.update({ where: { id: listing.id }, data: { images: JSON.stringify(urls) } });

  await audit(user.id, "LISTING_CREATED", "Listing", listing.id, title);
  revalidatePath("/listings");
  redirect(`/listings/${listing.id}?created=1`);
}

export async function archiveListingAction(listingId: string) {
  const user = await requireUser();
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;
  if (listing.sellerId !== user.id && !isStaff(user.role)) return;
  await db.listing.update({ where: { id: listingId }, data: { status: "ARCHIVED" } });
  await audit(user.id, "LISTING_ARCHIVED", "Listing", listingId);
  revalidatePath("/dashboard");
  revalidatePath("/listings");
}

export async function requestInspectionAction(listingId: string, formData: FormData) {
  const user = await requireUser();
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return;
  const type = ["VIRTUAL", "MOBILE", "CENTER"].includes(String(formData.get("type")))
    ? String(formData.get("type"))
    : "MOBILE";
  await db.inspection.upsert({
    where: { listingId },
    create: { listingId, type, status: "REQUESTED" },
    update: { type, status: "REQUESTED" },
  });
  await audit(user.id, "INSPECTION_REQUESTED", "Listing", listingId, type);
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard");
}
