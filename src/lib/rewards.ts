import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointLots } from "@/db/schema";

export function addThreeMonths(from: Date): Date {
  const result = new Date(from);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 3);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export async function getPointsBalance(userId: number, at = new Date()): Promise<number> {
  const rows = await db
    .select({ balance: sql<number>`coalesce(sum(${pointLots.remaining}), 0)::int` })
    .from(pointLots)
    .where(and(eq(pointLots.userId, userId), gt(pointLots.remaining, 0), gt(pointLots.expiresAt, at)));
  return Number(rows[0]?.balance ?? 0);
}

export async function getPointsSummary(userId: number, at = new Date()) {
  const lots = await db
    .select({ id: pointLots.id, remaining: pointLots.remaining, source: pointLots.source, expiresAt: pointLots.expiresAt })
    .from(pointLots)
    .where(and(eq(pointLots.userId, userId), gt(pointLots.remaining, 0), gt(pointLots.expiresAt, at)))
    .orderBy(asc(pointLots.expiresAt), asc(pointLots.createdAt), asc(pointLots.id));
  const balance = lots.reduce((total, lot) => total + lot.remaining, 0);
  const expiryCutoff = new Date(at.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringWithin30Days = lots
    .filter((lot) => lot.expiresAt <= expiryCutoff)
    .reduce((total, lot) => total + lot.remaining, 0);
  return { balance, expiringWithin30Days, lots };
}
