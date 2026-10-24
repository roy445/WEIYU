import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { coupons, emailVerificationTokens, sessions, userCoupons, users } from "@/db/schema";
import { createSession, deleteExpiredPendingRegistrations } from "@/lib/auth";
import { asString, fail, ok, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson(request);
  const token = asString(body.token, 200);
  if (!token) return fail("啟用連結無效，請重新申請啟用信。", 400);

  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await deleteExpiredPendingRegistrations();
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const tokenRows = await tx
        .select({ userId: emailVerificationTokens.userId })
        .from(emailVerificationTokens)
        .where(and(
          eq(emailVerificationTokens.id, tokenHash),
          gt(emailVerificationTokens.expiresAt, now),
        ))
        .for("update")
        .limit(1);
      const tokenRow = tokenRows[0];
      if (!tokenRow) return null;

      const userRows = await tx
        .select({
          id: users.id,
          role: users.role,
          name: users.name,
          emailVerifiedAt: users.emailVerifiedAt,
          pendingVerificationExpiresAt: users.pendingVerificationExpiresAt,
        })
        .from(users)
        .where(eq(users.id, tokenRow.userId))
        .for("update")
        .limit(1);
      const user = userRows[0];
      if (!user || user.emailVerifiedAt) return null;
      if (user.pendingVerificationExpiresAt && user.pendingVerificationExpiresAt <= now) {
        await tx.delete(users).where(eq(users.id, user.id));
        return null;
      }

      const isNewRegistration = user.pendingVerificationExpiresAt !== null;
      await tx.update(users).set({
        emailVerifiedAt: now,
        pendingVerificationExpiresAt: null,
      }).where(eq(users.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, user.id));

      let welcomeCouponGranted = false;
      if (isNewRegistration) {
        const couponRows = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, "NEW50"))
          .for("update")
          .limit(1);
        const coupon = couponRows[0];
        if (
          coupon
          && coupon.type === "fixed"
          && coupon.value === 50
          && coupon.isActive
          && coupon.expiresAt > now
          && (coupon.maxRedemptions === null || coupon.redemptionCount < coupon.maxRedemptions)
        ) {
          await tx.insert(userCoupons).values({
            userId: user.id,
            couponId: coupon.id,
            status: "available",
            claimedAt: now,
            expiresAt: new Date(now.getTime() + (coupon.claimExpiresDays ?? 30) * 24 * 60 * 60 * 1000),
          });
          await tx.update(coupons)
            .set({ redemptionCount: coupon.redemptionCount + 1 })
            .where(eq(coupons.id, coupon.id));
          welcomeCouponGranted = true;
        }
      }

      return { id: user.id, name: user.name, role: user.role, welcomeCouponGranted };
    });

    if (!result) return fail("啟用連結已失效、逾時或已使用。新註冊資料逾時後已刪除，請重新註冊；既有會員請重新申請啟用信。", 410);
    await createSession(result.id);
    return ok({
      user: { id: result.id, name: result.name, role: result.role },
      welcomeCouponGranted: result.welcomeCouponGranted,
      message: result.welcomeCouponGranted
        ? "帳號已啟用，NEW50 新會員優惠券已加入你的優惠券中心。"
        : "帳號已啟用，可以開始使用會員功能。",
    });
  } catch (error) {
    console.error("Account activation failed", error instanceof Error ? error.message : "unknown");
    return fail("啟用帳號時發生問題，請稍後再試。", 500);
  }
}
