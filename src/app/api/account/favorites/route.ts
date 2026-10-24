import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { favoriteProducts, products } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { asInt, fail, ok, readJson } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入才能查看收藏清單。", 401);

  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (Number.isSafeInteger(productId) && productId > 0) {
    const match = await db
      .select({ id: favoriteProducts.id })
      .from(favoriteProducts)
      .where(and(eq(favoriteProducts.userId, user.id), eq(favoriteProducts.productId, productId)))
      .limit(1);
    return ok({ isFavorite: Boolean(match[0]) });
  }

  const items = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      summary: products.summary,
      price: products.price,
      stock: products.stock,
      isActive: products.isActive,
      imageUrl: products.imageUrl,
      launchAt: products.launchAt,
    })
    .from(favoriteProducts)
    .innerJoin(products, eq(favoriteProducts.productId, products.id))
    .where(eq(favoriteProducts.userId, user.id))
    .orderBy(desc(favoriteProducts.createdAt));
  return ok({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入才能收藏商品。", 401);
  const body = await readJson(request);
  const productId = asInt(body.productId);
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail("商品編號不正確。");

  const product = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1);
  if (!product[0]) return fail("找不到上架中的商品。", 404);

  await db
    .insert(favoriteProducts)
    .values({ userId: user.id, productId })
    .onConflictDoNothing();
  return ok({ message: "已加入收藏。" });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  const url = new URL(request.url);
  const productId = Number(url.searchParams.get("productId"));
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail("商品編號不正確。");

  await db
    .delete(favoriteProducts)
    .where(and(eq(favoriteProducts.userId, user.id), eq(favoriteProducts.productId, productId)));
  return ok({ message: "已從收藏移除。" });
}
