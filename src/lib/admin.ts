import "server-only";

import { getCurrentUser, type SessionUser } from "./auth";

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `wy-${Date.now().toString(36)}`;
}

export function isSafeImageUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function optionalText(value: unknown, max = 1000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}
