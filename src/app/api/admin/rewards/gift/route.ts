import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements, coupons, orders, pointLots, userCoupons, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asInt, asString, fail, ok, readJson } from "@/lib/api";
import { addThreeMonths } from "@/lib/rewards";
import { logAdminAction } from "@/lib/orders";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const kind = asString(body.kind, 20);
  const audience = asString(body.audience, 20);
  const userId = asInt(body.userId);
  const couponId = asInt(body.couponId);
  const pointsAmount = asInt(body.pointsAmount);
  if (!["points", "coupon"].includes(kind)) return fail("請選擇贈送甜甜數或優惠券。");
  if (!["member", "all"].includes(audience)) return fail("贈送對象不正確。");
  if (audience === "member" && (!Number.isSafeInteger(userId) || userId <= 0)) return fail("請選擇一位會員。");
  if (kind === "coupon" && (!Number.isSafeInteger(couponId) || couponId <= 0)) return fail("請選擇已建立的優惠券。");
  if (kind === "points" && (!Number.isSafeInteger(pointsAmount) || pointsAmount < 1 || pointsAmount > 1_000_000)) {
    return fail("甜甜數贈送數量需介於 1 至 1,000,000 點。");
  }

  try {
    const result = await db.transaction(async (tx) => {
      let coupon: typeof coupons.$inferSelect | null = null;
      if (kind === "coupon") {
        const rows = await tx.select().from(coupons).where(eq(coupons.id, couponId)).for("update").limit(1);
        coupon = rows[0] ?? null;
        if (!coupon || !coupon.isActive || coupon.expiresAt <= new Date()) {
          throw new Error("此優惠券不存在、已停用或已到期。");
        }
      }

      const candidateRows = audience === "all"
        ? await tx.select({ id: users.id, createdAt: users.createdAt }).from(users).where(eq(users.role, "customer")).limit(10_001)
        : await tx.select({ id: users.id, createdAt: users.createdAt }).from(users).where(and(eq(users.id, userId), eq(users.role, "customer")));
      if (audience === "all" && candidateRows.length > 10_000) throw new Error("會員人數超出單次贈送上限（10,000 位），請改為分批操作。");
      if (audience === "member" && candidateRows.length === 0) throw new Error("找不到這位會員。");

      let recipientRows = candidateRows;
      if (coupon) {
        if (coupon.newMemberOnly) {
          recipientRows = recipientRows.filter((recipient) => recipient.createdAt >= coupon!.createdAt);
          if (audience === "member" && recipientRows.length === 0) throw new Error("此優惠券僅提供活動開始後註冊的新會員。");
        }
        if (coupon.firstOrderOnly && recipientRows.length) {
          const priorOrders = await tx.select({ userId: orders.userId }).from(orders)
            .where(and(inArray(orders.userId, recipientRows.map((recipient) => recipient.id)), sql`${orders.status} <> 'cancelled'`));
          const orderedUserIds = new Set(priorOrders.map((order) => order.userId));
          recipientRows = recipientRows.filter((recipient) => !orderedUserIds.has(recipient.id));
          if (audience === "member" && recipientRows.length === 0) throw new Error("此首購優惠券不適用於已建立過訂單的會員。");
        }
        const recipientIdsBeforeClaims = recipientRows.map((recipient) => recipient.id);
        const existingClaims = recipientIdsBeforeClaims.length
          ? await tx.select({ userId: userCoupons.userId }).from(userCoupons)
            .where(and(eq(userCoupons.couponId, coupon.id), inArray(userCoupons.userId, recipientIdsBeforeClaims)))
          : [];
        const existingIds = new Set(existingClaims.map((claim) => claim.userId));
        if (audience === "member" && existingIds.has(userId)) throw new Error("這位會員已領取或使用過此優惠券。");
        recipientRows = recipientRows.filter((recipient) => !existingIds.has(recipient.id));
        if (recipientRows.length === 0) throw new Error("目前沒有符合資格且未領取過此優惠券的會員。");
        if (coupon.maxRedemptions !== null && coupon.redemptionCount + recipientRows.length > coupon.maxRedemptions) {
          throw new Error(`剩餘可領取數量不足；目前僅剩 ${Math.max(0, coupon.maxRedemptions - coupon.redemptionCount)} 份。`);
        }
      }
      const recipientIds = recipientRows.map((row) => row.id);
      if (recipientIds.length === 0) throw new Error("目前沒有可接收贈禮的會員。");
      if (recipientIds.length > 10_000) throw new Error("會員人數超出單次贈送上限（10,000 位），請改為分批操作。");

      const now = new Date();
      const announcementTitle = kind === "points" ? "你收到一份甜甜數贈禮" : `你收到優惠券：${coupon!.title}`;
      const expiresAt = kind === "points" ? addThreeMonths(now) : coupon!.expiresAt;
      const detail = kind === "points"
        ? `店家贈送你 ${pointsAmount} 點甜甜數，有效期限至 ${new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "long" }).format(expiresAt)}。`
        : coupon!.type === "points"
          ? `優惠券代碼 ${coupon!.code} 已兌換，甜甜數已加入帳戶。點數有效期限為取得日起 3 個月。`
          : `優惠券代碼：${coupon!.code}。${coupon!.type === "percent" ? `${coupon!.value}% 折扣，最高折抵 NT$${coupon!.maxDiscount ?? 1_000_000}。` : `折抵 NT$${coupon!.value}。`} ${coupon!.minimumSubtotal > 0 ? `消費滿 NT$${coupon!.minimumSubtotal} 可使用。` : ""}請於 ${new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "long" }).format(expiresAt)} 前使用。`;

      if (kind === "points") {
        for (let offset = 0; offset < recipientIds.length; offset += 500) {
          const batch = recipientIds.slice(offset, offset + 500);
          await tx.insert(pointLots).values(batch.map((recipientId) => ({
            userId: recipientId,
            amount: pointsAmount,
            remaining: pointsAmount,
            source: "gift",
            createdAt: now,
            expiresAt,
          })));
        }
      } else {
        for (let offset = 0; offset < recipientIds.length; offset += 500) {
          const batch = recipientIds.slice(offset, offset + 500);
          await tx.insert(userCoupons).values(batch.map((recipientId) => ({
            userId: recipientId,
            couponId: coupon!.id,
            status: coupon!.type === "points" ? "redeemed" : "available",
            claimedAt: now,
            expiresAt: coupon!.type === "points" ? null : coupon!.expiresAt,
          })));
        }
        if (coupon!.type === "points") {
          const pointExpiry = addThreeMonths(now);
          for (let offset = 0; offset < recipientIds.length; offset += 500) {
            const batch = recipientIds.slice(offset, offset + 500);
            await tx.insert(pointLots).values(batch.map((recipientId) => ({
              userId: recipientId,
              amount: coupon!.value,
              remaining: coupon!.value,
              source: "coupon",
              sourceCouponId: coupon!.id,
              createdAt: now,
              expiresAt: pointExpiry,
            })));
          }
        }
        await tx.update(coupons)
          .set({ redemptionCount: sql`${coupons.redemptionCount} + ${recipientIds.length}` })
          .where(eq(coupons.id, coupon!.id));
      }

      const [announcement] = await tx.insert(announcements).values({
        title: announcementTitle,
        body: detail,
        type: "promotion",
        displayMode: "inbox",
        sendEmail: false,
        createdBy: admin.id,
      }).returning({ id: announcements.id });

      for (let offset = 0; offset < recipientIds.length; offset += 500) {
        const batch = recipientIds.slice(offset, offset + 500);
        await tx.insert(announcementNotifications).values(batch.map((recipientId) => ({
          announcementId: announcement.id,
          userId: recipientId,
        })));
      }

      return { count: recipientIds.length, announcementId: announcement.id };
    });

    await logAdminAction(admin, "rewards.gift", "announcement", result.announcementId, `${audience === "all" ? "全體會員" : `會員 ${userId}`} 收到${kind === "points" ? `${pointsAmount} 點甜甜數` : `優惠券 ${couponId}`}（${result.count} 位）`);
    return ok({
      message: `已贈送給 ${result.count} 位會員，站內通知已送達。`,
      recipientCount: result.count,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if ([
      "此優惠券不存在、已停用或已到期。",
      "找不到這位會員。",
      "此優惠券僅提供活動開始後註冊的新會員。",
      "此首購優惠券不適用於已建立過訂單的會員。",
      "這位會員已領取或使用過此優惠券。",
      "目前沒有符合資格且未領取過此優惠券的會員。",
      "目前沒有可接收贈禮的會員。",
    ].includes(message) || message.startsWith("剩餘可領取數量不足") || message.startsWith("會員人數超出")) {
      return fail(message, 409);
    }
    console.error("Reward gift failed", message || "unknown");
    return fail("贈送獎勵失敗，請稍後再試。", 500);
  }
}
