import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { productTrackers, products } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { asBool, asInt, fail, ok, readJson } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入才能管理商品追蹤。", 401);
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail("商品編號不正確。");
  const rows = await db.select({ emailEnabled: productTrackers.emailEnabled })
    .from(productTrackers)
    .where(and(eq(productTrackers.userId, user.id), eq(productTrackers.productId, productId)))
    .limit(1);
  return ok({ isTracking: Boolean(rows[0]), emailEnabled: rows[0]?.emailEnabled ?? false });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入才能開啟商品追蹤。", 401);
  const body = await readJson(request);
  const productId = asInt(body.productId);
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail("商品編號不正確。");
  const product = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1);
  if (!product[0]) return fail("找不到上架中的商品。", 404);
  await db.insert(productTrackers)
    .values({ userId: user.id, productId, emailEnabled: asBool(body.emailEnabled, false) })
    .onConflictDoUpdate({
      target: [productTrackers.userId, productTrackers.productId],
      set: { emailEnabled: asBool(body.emailEnabled, false) },
    });
  return ok({ isTracking: true, emailEnabled: asBool(body.emailEnabled, false) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail("商品編號不正確。");
  await db.delete(productTrackers)
    .where(and(eq(productTrackers.userId, user.id), eq(productTrackers.productId, productId)));
  return ok({ isTracking: false, message: "已關閉商品追蹤。" });
}
