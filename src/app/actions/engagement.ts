"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// ---------- Favorites ----------

export async function toggleFavoriteAction(listingId: string, currentPath: string) {
  const user = await requireUser();
  const existing = await db.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  if (existing) {
    await db.favorite.delete({ where: { userId_listingId: { userId: user.id, listingId } } });
  } else {
    await db.favorite.create({ data: { userId: user.id, listingId } });
  }
  revalidatePath(currentPath);
  revalidatePath("/dashboard");
}

// ---------- Messaging ----------

export async function contactSellerAction(listingId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId === user.id) return;

  const conversation = await db.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId: user.id } },
    create: { listingId, buyerId: user.id },
    update: {},
  });
  await db.message.create({
    data: { conversationId: conversation.id, senderId: user.id, body: body.slice(0, 2000) },
  });
  redirect(`/dashboard/messages/${conversation.id}`);
}

export async function sendMessageAction(conversationId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { listing: true },
  });
  if (!conversation) return;
  const isParticipant = conversation.buyerId === user.id || conversation.listing.sellerId === user.id;
  if (!isParticipant) return;

  await db.message.create({
    data: { conversationId, senderId: user.id, body: body.slice(0, 2000) },
  });
  revalidatePath(`/dashboard/messages/${conversationId}`);
}

// ---------- Offers ----------

export async function makeOfferAction(listingId: string, formData: FormData) {
  const user = await requireUser();
  const amount = Number.parseInt(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""), 10);
  const message = String(formData.get("message") ?? "").trim().slice(0, 500) || null;

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "ACTIVE" || listing.sellerId === user.id) return;
  if (!Number.isFinite(amount) || amount < 100) {
    redirect(`/listings/${listingId}?error=${encodeURIComponent("Enter a valid offer amount.")}`);
  }

  await db.offer.create({ data: { listingId, buyerId: user.id, amount, message } });
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}?offer=sent`);
}

async function acceptOffer(offerId: string, finalAmount: number) {
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer) return;
  await db.$transaction([
    db.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } }),
    db.offer.updateMany({
      where: { listingId: offer.listingId, id: { not: offerId }, status: { in: ["PENDING", "COUNTERED"] } },
      data: { status: "REJECTED" },
    }),
    db.listing.update({
      where: { id: offer.listingId },
      data: { status: "SOLD", soldPrice: finalAmount, soldAt: new Date() },
    }),
  ]);
}

/** Seller responds to an offer: accept | reject | counter. */
export async function respondOfferAction(offerId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision") ?? "");
  const offer = await db.offer.findUnique({ where: { id: offerId }, include: { listing: true } });
  if (!offer || offer.listing.sellerId !== user.id) return;
  if (!["PENDING"].includes(offer.status)) return;

  if (decision === "accept") {
    await acceptOffer(offerId, offer.amount);
  } else if (decision === "reject") {
    await db.offer.update({ where: { id: offerId }, data: { status: "REJECTED" } });
  } else if (decision === "counter") {
    const counter = Number.parseInt(String(formData.get("counterAmount") ?? "").replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(counter) && counter >= 100) {
      await db.offer.update({ where: { id: offerId }, data: { status: "COUNTERED", counterAmount: counter } });
    }
  }
  revalidatePath("/dashboard");
}

/** Buyer responds to a counter-offer or withdraws a pending offer. */
export async function buyerOfferAction(offerId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision") ?? "");
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.buyerId !== user.id) return;

  if (decision === "withdraw" && ["PENDING", "COUNTERED"].includes(offer.status)) {
    await db.offer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } });
  } else if (decision === "accept-counter" && offer.status === "COUNTERED" && offer.counterAmount) {
    await acceptOffer(offerId, offer.counterAmount);
  }
  revalidatePath("/dashboard");
}

// ---------- Test drives ----------

export async function requestTestDriveAction(listingId: string, formData: FormData) {
  const user = await requireUser();
  const when = new Date(String(formData.get("requestedAt") ?? ""));
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId === user.id || Number.isNaN(when.getTime())) return;

  await db.testDrive.create({ data: { listingId, buyerId: user.id, requestedAt: when } });
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}?testdrive=requested`);
}

export async function respondTestDriveAction(testDriveId: string, formData: FormData) {
  const user = await requireUser();
  const decision = String(formData.get("decision") ?? "");
  const td = await db.testDrive.findUnique({ where: { id: testDriveId }, include: { listing: true } });
  if (!td || td.listing.sellerId !== user.id) return;
  if (decision === "confirm") {
    await db.testDrive.update({ where: { id: testDriveId }, data: { status: "CONFIRMED" } });
  } else if (decision === "decline") {
    await db.testDrive.update({ where: { id: testDriveId }, data: { status: "DECLINED" } });
  }
  revalidatePath("/dashboard");
}

// ---------- Saved searches ----------

export async function saveSearchAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || "My search";
  const query = String(formData.get("query") ?? "").slice(0, 2000);
  await db.savedSearch.create({ data: { userId: user.id, name, query } });
  revalidatePath("/dashboard");
  redirect(`/listings?${query}&saved=1`);
}

export async function deleteSavedSearchAction(id: string) {
  const user = await requireUser();
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
}
