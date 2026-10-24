import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { fail } from "@/lib/api";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  try {
    const [rows, memberCountRows] = await Promise.all([
      db.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        isActive: products.isActive,
        viewCount: products.viewCount,
        cartAddCount: products.cartAddCount,
      }).from(products).orderBy(desc(products.viewCount), desc(products.cartAddCount), products.name),
      db.select({ total: count(users.id).mapWith(Number) }).from(users).where(eq(users.role, "customer")),
    ]);
    const totalViews = rows.reduce((total, product) => total + product.viewCount, 0);
    const totalAdds = rows.reduce((total, product) => total + product.cartAddCount, 0);
    const memberCount = memberCountRows[0]?.total ?? 0;
    return csvResponse("weiyu-analytics.csv", [
      ["資料類型", "商品名稱", "商品代碼", "上架狀態", "瀏覽次數", "加入購物袋次數", "會員總數"],
      ["總覽", "", "", "", totalViews, totalAdds, memberCount],
      ...rows.map((product) => [
        "商品",
        product.name,
        product.slug,
        product.isActive ? "上架中" : "已下架",
        product.viewCount,
        product.cartAddCount,
        "",
      ]),
    ]);
  } catch (error) {
    console.error("Analytics report export failed", error instanceof Error ? error.message : "unknown");
    return fail("無法匯出統計資料，請稍後再試。", 500);
  }
}
