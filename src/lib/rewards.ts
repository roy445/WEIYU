import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminActionLogs, coupons, orderPointUses, orders, pointLots, userCoupons } from "@/db/schema";

export async function getAvailableCoupons(userId: number, at = new Date()) {
  const expiresAt = sql<Date>`coalesce(${userCoupons.expiresAt}, ${coupons.expiresAt})`;
  return db
    .select({
      id: userCoupons.id,
      couponId: coupons.id,
      code: coupons.code,
      title: coupons.title,
      type: coupons.type,
      value: coupons.value,
      minimumSubtotal: coupons.minimumSubtotal,
      maxDiscount: coupons.maxDiscount,
      expiresAt,
    })
    .from(userCoupons)
    .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
    .where(and(
      eq(userCoupons.userId, userId),
      eq(userCoupons.status, "available"),
      eq(coupons.isActive, true),
      gt(expiresAt, at),
    ))
    .orderBy(asc(expiresAt));
}

export type PointHistoryEntry = {
  id: string;
  kind: "earned" | "spent" | "restored" | "expired" | "adjustment";
  title: string;
  description: string;
  amount: number;
  occurredAt: Date;
};

export async function getPointsHistory(userId: number, at = new Date()): Promise<PointHistoryEntry[]> {
  const [lots, uses, adjustmentLogs] = await Promise.all([
    db
      .select({
        id: pointLots.id,
        amount: pointLots.amount,
        remaining: pointLots.remaining,
        source: pointLots.source,
        sourceOrderNo: orders.orderNo,
        createdAt: pointLots.createdAt,
        expiresAt: pointLots.expiresAt,
      })
      .from(pointLots)
      .leftJoin(orders, eq(pointLots.sourceOrderId, orders.id))
      .where(eq(pointLots.userId, userId)),
    db
      .select({
        id: orderPointUses.id,
        amount: orderPointUses.amount,
        restoredAt: orderPointUses.restoredAt,
        orderNo: orders.orderNo,
        usedAt: orders.createdAt,
        lotExpiresAt: pointLots.expiresAt,
      })
      .from(orderPointUses)
      .innerJoin(orders, eq(orderPointUses.orderId, orders.id))
      .innerJoin(pointLots, eq(orderPointUses.pointLotId, pointLots.id))
      .where(eq(orders.userId, userId)),
    db
      .select({ id: adminActionLogs.id, detail: adminActionLogs.detail, createdAt: adminActionLogs.createdAt })
      .from(adminActionLogs)
      .where(and(
        eq(adminActionLogs.action, "points.adjust"),
        eq(adminActionLogs.targetType, "user"),
        eq(adminActionLogs.targetId, String(userId)),
      )),
  ]);

  const entries: PointHistoryEntry[] = [];
  const matchedGiftLots = new Set<number>();
  const giftLots = lots.filter((lot) => lot.source === "gift");
  for (const log of adjustmentLogs) {
    const match = log.detail?.match(/甜甜數調整\s+([+-]?\d+)\s*點/);
    if (!match) continue;
    const delta = Number(match[1]);
    if (!Number.isSafeInteger(delta) || delta === 0) continue;

    if (delta > 0) {
      const matchedLot = giftLots.find((lot) =>
        !matchedGiftLots.has(lot.id)
        && lot.amount === delta
        && Math.abs(lot.createdAt.getTime() - log.createdAt.getTime()) < 60_000,
      );
      if (matchedLot) matchedGiftLots.add(matchedLot.id);
    }

    const reason = log.detail?.match(/原因：([\s\S]*)$/)?.[1]?.trim();
    entries.push({
      id: `admin-adjustment-${log.id}`,
      kind: delta > 0 ? "earned" : "adjustment",
      title: delta > 0 ? "店家加點" : "店家扣點",
      description: reason ? `調整原因｜${reason}` : "店家手動調整甜甜數",
      amount: delta,
      occurredAt: log.createdAt,
    });
  }

  for (const lot of lots) {
    if (!(lot.source === "gift" && matchedGiftLots.has(lot.id))) {
      const source = lot.source === "order"
        ? "消費回饋"
        : lot.source === "coupon"
          ? "點數券兌換"
          : "店家贈送";
      entries.push({
        id: `lot-earned-${lot.id}`,
        kind: "earned",
        title: source,
        description: lot.sourceOrderNo ? `訂單 ${lot.sourceOrderNo} 完成回饋` : "甜甜數入帳",
        amount: lot.amount,
        occurredAt: lot.createdAt,
      });
    }

    if (lot.expiresAt <= at && lot.remaining > 0) {
      entries.push({
        id: `lot-expired-${lot.id}`,
        kind: "expired",
        title: "甜甜數到期",
        description: `未使用餘額到期｜${lot.source === "order" ? "消費回饋" : lot.source === "coupon" ? "點數券兌換" : "店家贈送"}`,
        amount: -lot.remaining,
        occurredAt: lot.expiresAt,
      });
    }
  }

  for (const use of uses) {
    entries.push({
      id: `point-use-${use.id}`,
      kind: "spent",
      title: "訂單折抵",
      description: `訂單 ${use.orderNo} 使用甜甜數`,
      amount: -use.amount,
      occurredAt: use.usedAt,
    });
    if (use.restoredAt && use.lotExpiresAt > use.restoredAt) {
      entries.push({
        id: `point-restore-${use.id}`,
        kind: "restored",
        title: "取消訂單回補",
        description: `訂單 ${use.orderNo} 取消後返還甜甜數`,
        amount: use.amount,
        occurredAt: use.restoredAt,
      });
    }
  }

  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

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
