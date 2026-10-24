import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "商品成效" };

export default async function AdminAnalyticsPage() {
  const [rows, memberCountRows] = await Promise.all([db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      isActive: products.isActive,
      viewCount: products.viewCount,
      cartAddCount: products.cartAddCount,
    })
    .from(products)
    .orderBy(desc(products.viewCount), desc(products.cartAddCount), products.name), db
    .select({ total: count(users.id).mapWith(Number) })
    .from(users)
    .where(eq(users.role, "customer"))]);
  const memberCount = memberCountRows[0]?.total ?? 0;
  const views = rows.reduce((sum, product) => sum + product.viewCount, 0);
  const additions = rows.reduce((sum, product) => sum + product.cartAddCount, 0);

  return (
    <div className="printable-report space-y-8">
      <header>
        <p className="eyebrow">Product insights</p>
        <h1 className="mt-3 text-3xl">商品成效</h1>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">
          顯示自功能啟用後累積的商品頁瀏覽與成功加入購物袋次數。僅統計總數，不建立個別會員的瀏覽或購物袋紀錄。
        </p>
      </header>

      <div className="print-hidden flex flex-wrap gap-2">
        <a href="/api/admin/reports/analytics" className="btn btn-secondary btn-sm">下載統計 CSV</a>
        <PrintButton label="列印／另存為 PDF" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface rounded-lg p-5">
          <p className="text-sm text-cocoa-soft">商品頁瀏覽次數</p>
          <p className="mt-2 font-serif text-4xl">{views.toLocaleString("zh-TW")}</p>
        </div>
        <div className="rounded-lg bg-cocoa p-5 text-cream">
          <p className="text-sm text-oat">加入購物袋次數</p>
          <p className="mt-2 font-serif text-4xl">{additions.toLocaleString("zh-TW")}</p>
        </div>
        <div className="surface rounded-lg p-5">
          <p className="text-sm text-cocoa-soft">會員總數</p>
          <p className="mt-2 font-serif text-4xl">{memberCount.toLocaleString("zh-TW")}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="surface rounded-lg px-5 py-10 text-center text-sm text-cocoa-soft">還沒有商品統計資料。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-mist/60 bg-[#fffdf8]">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-oat-soft/60 text-xs text-cocoa-soft">
              <tr>
                <th className="px-4 py-3 font-normal">商品</th>
                <th className="px-4 py-3 text-right font-normal">瀏覽</th>
                <th className="px-4 py-3 text-right font-normal">加入購物袋</th>
                <th className="px-4 py-3 text-right font-normal">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/60">
              {rows.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-caramel-deep hover:underline" href={`/products/${product.slug}`}>
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{product.viewCount.toLocaleString("zh-TW")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{product.cartAddCount.toLocaleString("zh-TW")}</td>
                  <td className="px-4 py-3 text-right text-xs text-cocoa-soft">{product.isActive ? "上架中" : "已下架"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-cocoa-soft">數字僅供營運參考；同一人重複瀏覽或加入都會分別累計。</p>
    </div>
  );
}
