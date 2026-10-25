import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, userCoupons } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asInt, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

function getDatabaseErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") return undefined;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const rows = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      title: coupons.title,
      type: coupons.type,
      value: coupons.value,
      minimumSubtotal: coupons.minimumSubtotal,
      maxDiscount: coupons.maxDiscount,
      expiresAt: coupons.expiresAt,
      newMemberOnly: coupons.newMemberOnly,
      firstOrderOnly: coupons.firstOrderOnly,
      claimExpiresDays: coupons.claimExpiresDays,
      maxRedemptions: coupons.maxRedemptions,
      redemptionCount: coupons.redemptionCount,
      isActive: coupons.isActive,
      createdAt: coupons.createdAt,
      claimedCount: sql<number>`count(${userCoupons.id})::int`,
    })
    .from(coupons)
    .leftJoin(userCoupons, eq(userCoupons.couponId, coupons.id))
    .groupBy(coupons.id)
    .orderBy(desc(coupons.createdAt));
  return ok({ items: rows });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const code = asString(body.code, 32).toUpperCase();
  const title = asString(body.title, 80);
  const type = asString(body.type, 20);
  const value = asInt(body.value);
  const minimumSubtotal = asInt(body.minimumSubtotal, 0);
  const maxDiscount = body.maxDiscount == null || body.maxDiscount === "" ? null : asInt(body.maxDiscount);
  const maxRedemptions = body.maxRedemptions == null || body.maxRedemptions === "" ? null : asInt(body.maxRedemptions);
  const expiresAt = new Date(asString(body.expiresAt, 40));

  if (!/^[A-Z0-9_-]{5,32}$/.test(code)) return fail("優惠券代碼需為 5 到 32 個英數字、底線或連字號。");
  if (title.length < 2) return fail("請填寫至少 2 個字的優惠券名稱。");
  if (!["fixed", "percent", "points"].includes(type)) return fail("優惠券類型不正確。");
  if (!Number.isInteger(value) || value <= 0 || (type === "percent" && value > 100)) {
    return fail(type === "percent" ? "折扣百分比需介於 1% 到 100%。" : "優惠金額或點數必須是正整數。");
  }
  if (!Number.isInteger(minimumSubtotal) || minimumSubtotal < 0 || minimumSubtotal > 1_000_000) {
    return fail("最低消費金額不正確。");
  }
  if (type === "percent" && (!Number.isInteger(maxDiscount) || maxDiscount! < 1 || maxDiscount! > 1_000_000)) {
    return fail("百分比優惠券必須設定 NT$1 到 NT$1,000,000 的最高折抵金額。");
  }
  if (type !== "percent" && maxDiscount !== null) return fail("只有百分比優惠券可以設定最高折抵金額。");
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1_000_000)) {
    return fail("兌換上限需為正整數，或留空代表不限量。");
  }
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) return fail("請設定未來的優惠券到期時間。");

  try {
    const created = await db
      .insert(coupons)
      .values({
        code,
        title,
        type,
        value,
        minimumSubtotal,
        maxDiscount,
        expiresAt,
        maxRedemptions,
        createdBy: admin.id,
      })
      .returning({ id: coupons.id });
    await logAdminAction(admin, "coupon.create", "coupon", created[0]?.id ?? null, `建立優惠券 ${code}`);
    return ok({ message: "優惠券已建立。", id: created[0]?.id }, 201);
  } catch (error) {
    const codeValue = getDatabaseErrorCode(error);
    if (codeValue === "23505") return fail("這組優惠券代碼已存在，請換一組代碼。", 409);
    console.error("Coupon creation failed", error instanceof Error ? error.message : "unknown");
    return fail("建立優惠券失敗，請稍後再試。", 500);
  }
}
