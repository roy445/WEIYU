import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { productMetricEvents, products } from "@/db/schema";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(clientKey(request, "product-metric"), 180, 60_000)) {
    return fail("請稍後再試。", 429);
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("商品編號不正確。");

  const body = await readJson(request);
  const event = asString(body.event, 20);
  if (event !== "view" && event !== "cart_add") return fail("統計事件不正確。");

  const exists = await db.transaction(async (tx) => {
    const counter = event === "view" ? products.viewCount : products.cartAddCount;
    const updated = await tx
      .update(products)
      .set({ [event === "view" ? "viewCount" : "cartAddCount"]: sql`${counter} + 1` })
      .where(and(eq(products.id, id), eq(products.isActive, true)))
      .returning({ id: products.id });
    if (!updated[0]) return false;
    await tx.insert(productMetricEvents).values({ productId: id, event });
    return true;
  });

  if (!exists) return fail("找不到上架中的商品。", 404);
  return ok();
}
