import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import type { Role } from "@/lib/constants";

export const SESSION_COOKIE = "nm_session";
const SESSION_DAYS = 7;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, role: string) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

/** Verifies the session cookie and loads the user. Null if absent/invalid/suspended. */
export const getCurrentUser = cache(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "SUSPENDED") return null;
    return user;
  } catch {
    return null;
  }
});

/** Redirects to /login when unauthenticated, or home when the role is not allowed. */
export async function requireUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role as Role)) redirect("/");
  return user;
}

export function isStaff(role: string) {
  return role === "ADMIN" || role === "MODERATOR";
}

export async function audit(
  actorId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: string
) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId, detail } });
}
