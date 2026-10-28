import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { favoriteProducts, productTrackers, productVariants, products } from "@/db/schema";
import { SIX_COOKIE_PACK_SLUG } from "@/lib/cookie-packs";
import { getCookieFlavorInventory } from "@/lib/products";

export type OutOfStockDemandItem = {
  id: number;
  slug: string;
  name: string;
  stock: number;
  cartAddCount: number;
  trackingCount: number;
  favoriteCount: number;
};

export async function getOutOfStockDemand(): Promise<OutOfStockDemandItem[]> {
  const [productRows, variantRows] = await Promise.all([
    db.select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      stock: products.stock,
      cartAddCount: products.cartAddCount,
      launchAt: products.launchAt,
    })
      .from(products)
      .where(eq(products.isActive, true)),
    db.select({ productId: productVariants.productId, stock: productVariants.stock })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(eq(products.isActive, true), eq(productVariants.isActive, true))),
  ]);

  const cookieInventory = productRows.some((product) => product.slug === SIX_COOKIE_PACK_SLUG)
    ? await getCookieFlavorInventory()
    : null;
  const variantsByProduct = new Map<number, number[]>();
  for (const variant of variantRows) {
    const stocks = variantsByProduct.get(variant.productId) ?? [];
    stocks.push(variant.stock);
    variantsByProduct.set(variant.productId, stocks);
  }

  const now = Date.now();
  const outOfStock = productRows.flatMap((product) => {
    if (product.launchAt && product.launchAt.getTime() > now) return [];
    const stock = product.slug === SIX_COOKIE_PACK_SLUG && cookieInventory
      ? cookieInventory.availability.maxAvailable
      : product.stock;
    const activeVariantStocks = product.slug === SIX_COOKIE_PACK_SLUG
      ? []
      : variantsByProduct.get(product.id) ?? [];
    const hasAvailableStock = stock > 0 && (
      activeVariantStocks.length === 0 || activeVariantStocks.some((variantStock) => variantStock > 0)
    );
    return hasAvailableStock ? [] : [{ ...product, stock: Math.max(0, stock) }];
  });

  if (outOfStock.length === 0) return [];
  const productIds = outOfStock.map((product) => product.id);
  const [trackingRows, favoriteRows] = await Promise.all([
    db.select({
      productId: productTrackers.productId,
      total: sql<number>`count(*)::int`,
    })
      .from(productTrackers)
      .where(inArray(productTrackers.productId, productIds))
      .groupBy(productTrackers.productId),
    db.select({
      productId: favoriteProducts.productId,
      total: sql<number>`count(*)::int`,
    })
      .from(favoriteProducts)
      .where(inArray(favoriteProducts.productId, productIds))
      .groupBy(favoriteProducts.productId),
  ]);
  const trackingByProduct = new Map(trackingRows.map((row) => [row.productId, Number(row.total)]));
  const favoritesByProduct = new Map(favoriteRows.map((row) => [row.productId, Number(row.total)]));

  return outOfStock
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      stock: product.stock,
      cartAddCount: Number(product.cartAddCount),
      trackingCount: trackingByProduct.get(product.id) ?? 0,
      favoriteCount: favoritesByProduct.get(product.id) ?? 0,
    }))
    .sort((left, right) =>
      right.trackingCount - left.trackingCount ||
      right.favoriteCount - left.favoriteCount ||
      right.cartAddCount - left.cartAddCount ||
      left.name.localeCompare(right.name, "zh-TW"),
    );
}
