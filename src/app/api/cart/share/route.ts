import { createHash, randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cartShares, productVariants, products } from "@/db/schema";
import { clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";
import { getSixCookieVariantAvailability, SIX_COOKIE_PACK_SLUG } from "@/lib/cookie-packs";
import { getCookieFlavorInventory } from "@/lib/products";

type ShareItem = { productId: number; variantId: number | null; quantity: number };

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "cart-share-create"), 20, 60 * 60 * 1000)) {
    return fail("分享連結建立次數過多，請稍後再試。", 429);
  }
  const body = await readJson(request);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return fail("分享購物袋需包含 1 到 30 個商品。");
  }
  const items: ShareItem[] = body.items.map((entry) => {
    const item = entry as Record<string, unknown>;
    return {
      productId: Number(item.productId),
      variantId: item.variantId == null ? null : Number(item.variantId),
      quantity: Number(item.quantity),
    };
  });
  if (items.some((item) =>
    !Number.isSafeInteger(item.productId) || item.productId <= 0 ||
    (item.variantId !== null && (!Number.isSafeInteger(item.variantId) || item.variantId <= 0)) ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99
  )) return fail("購物袋商品資料不正確。");

  try {
    const productRows = await db.select().from(products).where(inArray(products.id, [...new Set(items.map((item) => item.productId))]));
    const productMap = new Map(productRows.map((product) => [product.id, product]));
    const variantIds = items.map((item) => item.variantId).filter((id): id is number => id !== null);
    const variantRows = variantIds.length ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds)) : [];
    const variantMap = new Map(variantRows.map((variant) => [variant.id, variant]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      const variant = item.variantId === null ? null : variantMap.get(item.variantId);
      if (!product || !product.isActive || product.price <= 0 || (product.launchAt && product.launchAt > new Date()) || (item.variantId !== null && (!variant || variant.productId !== product.id || !variant.isActive))) {
        return fail("購物袋含有已下架或已更新的商品，請整理後再分享。", 409);
      }
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.insert(cartShares).values({
      tokenHash,
      items,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return ok({ token }, 201);
  } catch (error) {
    console.error("Cart share creation failed", error instanceof Error ? error.message : "unknown");
    return fail("建立購物袋分享連結失敗，請稍後再試。", 500);
  }
}

export async function GET(request: Request) {
  if (!rateLimit(clientKey(request, "cart-share-read"), 120, 60 * 60 * 1000)) {
    return fail("分享連結讀取次數過多，請稍後再試。", 429);
  }
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return fail("分享連結格式不正確。");
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const shares = await db.select().from(cartShares).where(eq(cartShares.tokenHash, tokenHash)).limit(1);
    const share = shares[0];
    if (!share || share.expiresAt <= new Date()) return fail("分享連結已失效或不存在。", 404);

    const items: ShareItem[] = share.items;
    const productRows = await db.select().from(products).where(inArray(products.id, [...new Set(items.map((item) => item.productId))]));
    const productMap = new Map(productRows.map((product) => [product.id, product]));
    const variantIds = items.map((item) => item.variantId).filter((id): id is number => id !== null);
    const variantRows = variantIds.length ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds)) : [];
    const variantMap = new Map(variantRows.map((variant) => [variant.id, variant]));
    const hasCookieBag = [...productMap.values()].some((product) => product.slug === SIX_COOKIE_PACK_SLUG);
    const cookieInventory = hasCookieBag ? await getCookieFlavorInventory() : null;
    const result = items.flatMap((item) => {
      const product = productMap.get(item.productId);
      const variant = item.variantId === null ? null : variantMap.get(item.variantId);
      if (!product || !product.isActive || product.price <= 0 || (product.launchAt && product.launchAt > new Date()) || (item.variantId !== null && (!variant || variant.productId !== product.id || !variant.isActive))) return [];
      if (product.slug === SIX_COOKIE_PACK_SLUG && !variant) return [];
      const stock = product.slug === SIX_COOKIE_PACK_SLUG && cookieInventory
        ? getSixCookieVariantAvailability(variant!.name, cookieInventory.availability)
        : variant ? Math.min(product.stock, variant.stock) : product.stock;
      if (stock <= 0) return [];
      return [{
        productId: product.id,
        variantId: variant?.id ?? null,
        slug: product.slug,
        name: product.name,
        variantName: variant?.name ?? null,
        unitPrice: product.price + (variant?.priceDelta ?? 0),
        quantity: Math.min(item.quantity, stock, 99),
        maxQuantity: Math.min(stock, 99),
        imageUrl: product.imageUrl,
      }];
    });
    return ok({ items: result, expiresAt: share.expiresAt });
  } catch (error) {
    console.error("Cart share lookup failed", error instanceof Error ? error.message : "unknown");
    return fail("讀取購物袋分享內容失敗，請稍後再試。", 500);
  }
}
