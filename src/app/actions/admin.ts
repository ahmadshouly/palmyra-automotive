"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";
import { ROLES, type Role } from "@/lib/constants";
import { SETTING_DEFAULTS } from "@/lib/settings";

// ---------- Listing moderation ----------

export async function moderateListingAction(listingId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN", "MODERATOR"]);
  const decision = String(formData.get("decision") ?? "");
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  if (decision === "approve") {
    await db.listing.update({ where: { id: listingId }, data: { status: "ACTIVE", rejectReason: null } });
    await audit(admin.id, "LISTING_APPROVED", "Listing", listingId);
  } else if (decision === "reject") {
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || "Policy violation";
    await db.listing.update({ where: { id: listingId }, data: { status: "REJECTED", rejectReason: reason } });
    await audit(admin.id, "LISTING_REJECTED", "Listing", listingId, reason);
  } else if (decision === "archive") {
    await db.listing.update({ where: { id: listingId }, data: { status: "ARCHIVED" } });
    await audit(admin.id, "LISTING_ARCHIVED_BY_ADMIN", "Listing", listingId);
  } else if (decision === "feature") {
    const tier = String(formData.get("tier") ?? "PREMIUM");
    if (["FREE", "PREMIUM", "ULTIMATE"].includes(tier)) {
      await db.listing.update({ where: { id: listingId }, data: { tier } });
      await audit(admin.id, "LISTING_TIER_CHANGED", "Listing", listingId, tier);
    }
  }
  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
}

// ---------- User management ----------

export async function updateUserAction(userId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  if (userId === admin.id) return; // cannot modify own account here

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return;

  const role = String(formData.get("role") ?? target.role);
  const status = String(formData.get("status") ?? target.status);
  const verified = formData.get("verified") === "on";

  if (!(ROLES as readonly string[]).includes(role)) return;
  if (!["ACTIVE", "SUSPENDED"].includes(status)) return;

  await db.user.update({ where: { id: userId }, data: { role: role as Role, status, verified } });
  await audit(admin.id, "USER_UPDATED", "User", userId, `role=${role} status=${status} verified=${verified}`);
  revalidatePath("/admin/users");
}

// ---------- Inspections (staff completes) ----------

export async function completeInspectionAction(inspectionId: string, formData: FormData) {
  const staff = await requireUser(["ADMIN", "MODERATOR", "INSPECTOR"]);
  const score = Number.parseInt(String(formData.get("score") ?? ""), 10);
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 1000);
  if (!Number.isFinite(score) || score < 0 || score > 100) return;

  await db.inspection.update({
    where: { id: inspectionId },
    data: { status: "COMPLETED", score, summary, completedAt: new Date(), inspectorId: staff.id },
  });
  await audit(staff.id, "INSPECTION_COMPLETED", "Inspection", inspectionId, `score=${score}`);
  revalidatePath("/admin/inspections");
}

// ---------- Site settings (brand name, banner, fees…) ----------

const BANNER_EXT: Record<string, string> = {
  "image/jpeg": ".jpeg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);

  const updates: Record<string, string> = {};
  for (const key of Object.keys(SETTING_DEFAULTS)) {
    const raw = formData.get(key);
    if (typeof raw === "string") updates[key] = raw.trim().slice(0, 500);
  }
  updates.maintenanceMode = formData.get("maintenanceMode") === "on" ? "1" : "0";

  if (!updates.siteName) delete updates.siteName; // never allow an empty brand name

  const fee = Number.parseFloat(updates.transactionFeePct ?? "");
  if (!Number.isFinite(fee) || fee < 0 || fee > 50) delete updates.transactionFeePct;

  // Optional new banner upload
  const banner = formData.get("bannerFile");
  if (banner instanceof File && banner.size > 0 && banner.size <= 10 * 1024 * 1024) {
    const ext = BANNER_EXT[banner.type];
    if (ext) {
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      const name = `banner-${Date.now()}${ext}`;
      await writeFile(path.join(dir, name), Buffer.from(await banner.arrayBuffer()));
      updates.bannerPath = `/uploads/${name}`;
    }
  }

  await db.$transaction(
    Object.entries(updates).map(([key, value]) =>
      db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );

  await audit(admin.id, "SETTINGS_UPDATED", "SiteSetting", undefined, Object.keys(updates).join(","));
  revalidatePath("/", "layout"); // brand name / banner apply across the whole app
}
