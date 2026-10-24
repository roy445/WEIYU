import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, pointLots, userCoupons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";
import { addThreeMonths, getPointsSummary } from "@/lib/rewards";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);

  try {
    const [items, points] = await Promise.all([
      db
        .select({
          id: userCoupons.id,
          couponId: coupons.id,
          code: coupons.code,
          title: coupons.title,
          type: coupons.type,
          value: coupons.value,
          minimumSubtotal: coupons.minimumSubtotal,
          expiresAt: coupons.expiresAt,
        })
        .from(userCoupons)
        .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
        .where(and(
          eq(userCoupons.userId, user.id),
          eq(userCoupons.status, "available"),
          gt(coupons.expiresAt, new Date()),
        ))
        .orderBy(coupons.expiresAt),
      getPointsSummary(user.id),
    ]);
    return ok({ items, points });
  } catch (error) {
    console.error("Rewards lookup failed", error instanceof Error ? error.message : "unknown");
    return fail("無法讀取優惠券與點數，請稍後再試。", 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  if (!rateLimit(`coupon-claim:${user.id}:${clientKey(request, "coupon-claim")}`, 8, 60 * 60 * 1000)) {
    return fail("兌換次數過多，請稍後再試。", 429);
  }

  const body = await readJson(request);
  const code = asString(body.code, 32).toUpperCase();
  if (!/^[A-Z0-9_-]{6,32}$/.test(code)) return fail("優惠券代碼格式不正確。");

  try {
    const message = await db.transaction(async (tx) => {
      const rows = await tx.select().from(coupons).where(eq(coupons.code, code)).for("update").limit(1);
      const coupon = rows[0];
      const now = new Date();
      if (!coupon || !coupon.isActive || coupon.expiresAt <= now) {
        return { error: "優惠券不存在、已停用或已到期。" };
      }
      if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
        return { error: "此優惠券已兌換完畢。" };
      }

      const claimed = await tx
        .insert(userCoupons)
        .values({ userId: user.id, couponId: coupon.id, status: coupon.type === "points" ? "redeemed" : "available" })
        .onConflictDoNothing()
        .returning({ id: userCoupons.id });
      if (!claimed[0]) return { error: "你已領取或使用過這組優惠券代碼。" };

      await tx
        .update(coupons)
        .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
        .where(eq(coupons.id, coupon.id));

      if (coupon.type === "points") {
        await tx.insert(pointLots).values({
          userId: user.id,
          amount: coupon.value,
          remaining: coupon.value,
          source: "coupon",
          sourceCouponId: coupon.id,
          createdAt: now,
          expiresAt: addThreeMonths(now),
        });
        return { message: `已獲得 ${coupon.value} 點，點數有效期限為 3 個月。` };
      }

      return { message: "優惠券已加入你的優惠券中心。" };
    });

    if ("error" in message && message.error) return fail(message.error, 409);
    const points = await getPointsSummary(user.id);
    return ok({ message: message.message, points }, 201);
  } catch (error) {
    console.error("Coupon claim failed", error instanceof Error ? error.message : "unknown");
    return fail("兌換優惠券失敗，請稍後再試。", 500);
  }
}
