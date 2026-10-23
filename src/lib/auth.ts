import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "weiyu_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "admin";
  theme: "light" | "dark";
  avatarColor: string;
  avatarUrl: string | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({
    id: tokenHash,
    userId,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<number | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.id, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
      .for("update")
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.id, row.id));
    return row.userId;
  });
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const derived = scryptSync(password.normalize("NFKC"), salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** 變更密碼後，登出此使用者在其他裝置的所有 Session，保留目前這一個。 */
export async function revokeOtherSessions(userId: number): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return;
  }
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, hashToken(token))));
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        theme: users.theme,
        avatarColor: users.avatarColor,
        avatarUrl: users.avatarUrl,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role === "admin" ? "admin" : "customer",
      theme: row.theme === "dark" ? "dark" : "light",
      avatarColor: row.avatarColor,
      avatarUrl: row.avatarUrl,
    };
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "密碼至少需要 8 個字元。";
  if (password.length > 72) return "密碼長度不可超過 72 個字元。";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "密碼需同時包含英文字母與數字。";
  }
  return null;
}
