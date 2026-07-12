"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit, createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { getT, getLocale } from "@/lib/i18n";
import { createAuthCode, verifyAuthCode } from "@/lib/otp";
import { sendAuthCodeEmail } from "@/lib/email";

function sanitizeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** Creates and emails a fresh code, respecting the resend cooldown. */
async function issueCode(email: string, purpose: "VERIFY" | "RESET") {
  const code = await createAuthCode(email, purpose);
  if (code) await sendAuthCodeEmail(email, code, purpose, getLocale());
}

export async function registerAction(formData: FormData) {
  const t = getT();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;

  const fail = (msg: string) => redirect(`/register?error=${encodeURIComponent(msg)}`);

  if (name.length < 2) fail(t("auth.error.name"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(t("auth.error.email"));
  if (password.length < 8) fail(t("auth.error.password"));

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) fail(t("auth.error.exists"));

  // Self-registration always creates a buyer account; other roles are
  // assigned by an administrator (only admins can create listings).
  // The account starts unverified — the user must confirm the emailed code.
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "BUYER",
      city,
      state,
      verified: false,
    },
  });

  await audit(user.id, "USER_REGISTERED", "User", user.id, "role=BUYER");
  await issueCode(email, "VERIFY");
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyAction(formData: FormData) {
  const t = getT();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();

  const fail = (msg: string) =>
    redirect(`/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent(msg)}`);

  const user = await db.user.findUnique({ where: { email } });
  if (!user) fail(t("auth.error.invalid"));

  const ok = await verifyAuthCode(email, "VERIFY", code);
  if (!ok) fail(t("auth.otpInvalid"));

  await db.user.update({ where: { id: user!.id }, data: { verified: true } });
  await audit(user!.id, "USER_VERIFIED", "User", user!.id);
  await createSession(user!.id, user!.role);
  redirect("/dashboard");
}

export async function resendVerifyAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.verified) await issueCode(email, "VERIFY");
  redirect(`/verify?email=${encodeURIComponent(email)}&sent=1`);
}

export async function loginAction(formData: FormData) {
  const t = getT();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNext(formData.get("next"));

  const fail = (msg: string) =>
    redirect(`/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);

  const user = await db.user.findUnique({ where: { email } });
  if (!user) fail(t("auth.error.invalid"));
  if (user!.status === "SUSPENDED") fail(t("auth.error.suspended"));

  const ok = await bcrypt.compare(password, user!.passwordHash);
  if (!ok) fail(t("auth.error.invalid"));

  // Unverified accounts must confirm their email before signing in.
  if (!user!.verified) {
    await issueCode(email, "VERIFY");
    redirect(`/verify?email=${encodeURIComponent(email)}&sent=1`);
  }

  await createSession(user!.id, user!.role);
  redirect(next);
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Always behave identically whether or not the account exists, to avoid
  // leaking which emails are registered.
  const user = await db.user.findUnique({ where: { email } });
  if (user) await issueCode(email, "RESET");

  redirect(`/reset?email=${encodeURIComponent(email)}`);
}

export async function resetPasswordAction(formData: FormData) {
  const t = getT();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fail = (msg: string) =>
    redirect(`/reset?email=${encodeURIComponent(email)}&error=${encodeURIComponent(msg)}`);

  if (password.length < 8) fail(t("auth.error.password"));

  const user = await db.user.findUnique({ where: { email } });
  if (!user) fail(t("auth.otpInvalid"));

  const ok = await verifyAuthCode(email, "RESET", code);
  if (!ok) fail(t("auth.otpInvalid"));

  await db.user.update({
    where: { id: user!.id },
    data: { passwordHash: await bcrypt.hash(password, 10), verified: true },
  });
  await audit(user!.id, "PASSWORD_RESET", "User", user!.id);
  redirect(`/login?reset=1`);
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) destroySession();
  redirect("/");
}
