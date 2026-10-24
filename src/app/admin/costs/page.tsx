import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { materials, products } from "@/db/schema";
import { ProductCostManager } from "@/components/admin/product-cost-manager";
import { getProductCost } from "@/lib/product-costs";
import { getProductTrends } from "@/lib/product-trends";

export const metadata: Metadata = { title: "成本與定價" };

export default async function AdminCostsPage() {
  const [productRows, materialRows, trendRows] = await Promise.all([
    db.select({ id: products.id, name: products.name, price: products.price, stock: products.stock })
      .from(products).orderBy(asc(products.name)),
    db.select().from(materials).orderBy(asc(materials.name)),
    getProductTrends(30),
  ]);
  const initialCost = productRows[0] ? await getProductCost(productRows[0].id) : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Product costs</p>
        <h1 className="mt-3 text-3xl">材料成本與定價建議</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
          材料、配方、工時與水電成本僅供後台使用，不會出現在顧客商品頁。系統以目標毛利率計算建議售價；瀏覽趨勢只提供參考，不會自動調整售價。
        </p>
      </header>
      <ProductCostManager products={productRows} materials={materialRows} initialCost={initialCost} trends={trendRows} />
    </div>
  );
}
