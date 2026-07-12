import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export type AuthPurpose = "VERIFY" | "RESET";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

/** Generates a 6-digit numeric code. */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Creates (or replaces) an auth code for the given email + purpose and returns
 * the plaintext code so the caller can email it. Returns null when a code was
 * requested too recently (cooldown), to throttle abuse.
 */
export async function createAuthCode(
  email: string,
  purpose: AuthPurpose
): Promise<string | null> {
  const recent = await db.authCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return null;
  }

  await db.authCode.deleteMany({ where: { email, purpose } });

  const code = generateCode();
  await db.authCode.create({
    data: {
      email,
      purpose,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Verifies a submitted code. On success the code is consumed (deleted).
 * Enforces expiry and a maximum number of attempts.
 */
export async function verifyAuthCode(
  email: string,
  purpose: AuthPurpose,
  code: string
): Promise<boolean> {
  const record = await db.authCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  if (record.expiresAt.getTime() < Date.now() || record.attempts >= MAX_ATTEMPTS) {
    await db.authCode.deleteMany({ where: { email, purpose } });
    return false;
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    await db.authCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await db.authCode.deleteMany({ where: { email, purpose } });
  return true;
}
