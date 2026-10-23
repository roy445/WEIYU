import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function asString(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function asInt(value: unknown, fallback = NaN): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return fallback;
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0" || value === "off") return false;
  return fallback;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
