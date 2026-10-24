import { requireAdmin } from "@/lib/admin";
import { fail, ok } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getProductTrends } from "@/lib/product-trends";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const items = await getProductTrends(30);
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return csvResponse("weiyu-product-trends.csv", [
      ["商品", "目前售價", "目前庫存", "30天瀏覽", "30天加購", "30天完成售出", "加購／瀏覽比（%）", "建議"],
      ...items.map((item) => [
        item.name,
        item.price,
        item.stock,
        item.views,
        item.cartAdds,
        item.unitsSold,
        item.conversionPercent,
        item.suggestion,
      ]),
    ]);
  }
  return ok({ days: 30, items });
}
