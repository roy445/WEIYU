import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, productMetricEvents, products } from "@/db/schema";

export async function getProductTrends(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [productsWithMetrics, completedOrders] = await Promise.all([
    db.select({
      id: products.id,
      name: products.name,
      price: products.price,
      stock: products.stock,
      views: sql<number>`count(*) filter (where ${productMetricEvents.event} = 'view')::int`,
      cartAdds: sql<number>`count(*) filter (where ${productMetricEvents.event} = 'cart_add')::int`,
    })
      .from(products)
      .leftJoin(productMetricEvents, and(
        eq(productMetricEvents.productId, products.id),
        gte(productMetricEvents.createdAt, since),
      ))
      .groupBy(products.id),
    db.select({
      productId: orderItems.productId,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.status, "completed"), gte(orders.completedAt, since)))
      .groupBy(orderItems.productId),
  ]);
  const unitsByProduct = new Map(completedOrders.map((row) => [row.productId, row.unitsSold]));
  return productsWithMetrics.map((product) => {
    const unitsSold = unitsByProduct.get(product.id) ?? 0;
    const conversion = product.views > 0 ? product.cartAdds / product.views : 0;
    let suggestion = "需求表現尚未達明顯訊號，維持現價並持續觀察。";
    if (product.stock <= 0) {
      suggestion = "目前無庫存，先確認補貨能力；缺貨期間的趨勢不適合作為調價依據。";
    } else if (product.views < 20) {
      suggestion = "30 天瀏覽未達 20 次，樣本不足；先累積曝光再判斷價格。";
    } else if (product.stock <= 2) {
      suggestion = "庫存偏低，優先評估補貨能力；供給受限時先不要只因短期需求調價。";
    } else if (product.cartAdds >= 3 && conversion >= 0.15 && unitsSold >= 2) {
      suggestion = "瀏覽、加購與完成訂單訊號偏強，可小幅測試提高售價 3–5%，並比較下一個觀察期；不會自動改價。";
    } else if (product.cartAdds === 0 && unitsSold === 0) {
      suggestion = "有瀏覽但沒有加購或完成訂單，先檢查商品頁、供給與價格定位；資訊無誤時可測試短期小幅折扣，並比較下一個 30 天成效。";
    }
    return {
      ...product,
      unitsSold,
      conversionPercent: Math.round(conversion * 1000) / 10,
      suggestion,
    };
  });
}
