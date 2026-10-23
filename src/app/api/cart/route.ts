import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { fail, ok, readJson } from "@/lib/api";

type CartInput = { productId: number; variantId?: number | null; quantity: number };

export async function POST(request: Request) {
  const body = await readJson(request);
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return ok({ lines: [], subtotal: 0, issues: [] });
  }
  if (rawItems.length > 60) return fail("購物袋品項過多。");

  const items: CartInput[] = rawItems
    .map((raw) => {
      const record = raw as Record<string, unknown>;
      return {
        productId: Number(record.productId),
        variantId: record.variantId ? Number(record.variantId) : null,
        quantity: Number(record.quantity),
      };
    })
    .filter((item) => Number.isInteger(item.productId) && item.productId > 0);

  if (items.length === 0) return ok({ lines: [], subtotal: 0, issues: [] });

  try {
    const productRows = await db
      .select()
      .from(products)
      .where(inArray(products.id, [...new Set(items.map((item) => item.productId))]));
    const productMap = new Map(productRows.map((row) => [row.id, row]));

    const variantIds = items
      .map((item) => item.variantId)
      .filter((value): value is number => typeof value === "number");
    const variantRows = variantIds.length
      ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
      : [];
    const variantMap = new Map(variantRows.map((row) => [row.id, row]));

    const issues: string[] = [];
    const lines = items.flatMap((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        issues.push("有商品已不存在，已從購物袋移除。");
        return [];
      }
      if (!product.isActive) {
        issues.push(`「${product.name}」目前暫停販售。`);
        return [];
      }
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      if (item.variantId && (!variant || variant.productId !== product.id || !variant.isActive)) {
        issues.push(`「${product.name}」的規格已更新，請重新選擇。`);
        return [];
      }
      const unitPrice = product.price + (variant?.priceDelta ?? 0);
      const maxQuantity = Math.min(99, variant ? Math.min(product.stock, variant.stock) : product.stock);
      const quantity = Math.max(1, Math.min(Number.isFinite(item.quantity) ? item.quantity : 1, Math.max(1, maxQuantity)));
      if (quantity < item.quantity) {
        issues.push(`「${product.name}」可售數量有限，已調整為 ${quantity} 份。`);
      }
      return [
        {
          productId: product.id,
          variantId: variant?.id ?? null,
          slug: product.slug,
          name: product.name,
          variantName: variant?.name ?? null,
          imageUrl: product.imageUrl,
          unitPrice,
          quantity,
          lineTotal: unitPrice * quantity,
          maxQuantity,
          stock: product.stock,
          isActive: product.isActive,
        },
      ];
    });

    return ok({
      lines,
      subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
      issues,
    });
  } catch {
    return fail("無法讀取購物袋，請稍後再試。", 500);
  }
}
