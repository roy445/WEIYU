import type { Metadata } from "next";
import Link from "next/link";
import { getOutOfStockDemand } from "@/lib/product-demand";

export const metadata: Metadata = { title: "缺貨需求" };

export default async function AdminDemandPage() {
  const items = await getOutOfStockDemand();
  const withSignals = items.filter((item) => item.trackingCount + item.favoriteCount + item.cartAddCount > 0);
  const trackingTotal = items.reduce((sum, item) => sum + item.trackingCount, 0);
  const favoriteTotal = items.reduce((sum, item) => sum + item.favoriteCount, 0);
  const cartAddTotal = items.reduce((sum, item) => sum + item.cartAddCount, 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Restock demand</p>
        <h1 className="mt-3 text-3xl">缺貨需求</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
          觀察目前缺貨商品的追蹤、收藏與加購訊號，協助安排補貨。只顯示彙總數字，不顯示會員個資。
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "目前缺貨商品", value: items.length },
          { label: "有需求訊號", value: withSignals.length },
          { label: "追蹤中會員", value: trackingTotal },
          { label: "目前收藏", value: favoriteTotal },
          { label: "成功加購累計", value: cartAddTotal },
        ].map((summary) => (
          <div key={summary.label} className="surface rounded-lg px-4 py-4">
            <p className="text-xs text-cocoa-soft">{summary.label}</p>
            <p className="mt-2 font-serif text-3xl text-cocoa">{summary.value.toLocaleString("zh-TW")}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="demand-list">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="demand-list" className="text-xl">目前缺貨品項</h2>
            <p className="mt-1 text-xs text-cocoa-soft">上架中、非即將上架，且沒有任何可售庫存的商品。</p>
          </div>
          <Link href="/admin/products?filter=out" className="text-xs text-caramel-deep underline underline-offset-4">
            前往商品庫存管理
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="surface mt-4 rounded-lg px-5 py-10 text-center text-sm text-cocoa-soft">
            目前沒有缺貨中的上架商品。
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-mist/60 bg-[#fffdf8]">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-oat-soft/60 text-xs text-cocoa-soft">
                <tr>
                  <th className="px-4 py-3 font-normal">商品</th>
                  <th className="px-4 py-3 text-right font-normal">可售庫存</th>
                  <th className="px-4 py-3 text-right font-normal">追蹤中</th>
                  <th className="px-4 py-3 text-right font-normal">目前收藏</th>
                  <th className="px-4 py-3 text-right font-normal">成功加購累計</th>
                  <th className="px-4 py-3 text-right font-normal">需求狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/60">
                {items.map((item) => {
                  const hasSignal = item.trackingCount + item.favoriteCount + item.cartAddCount > 0;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <Link href={`/products/${item.slug}`} target="_blank" rel="noreferrer" className="font-medium text-caramel-deep hover:underline">
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-cocoa-soft">/{item.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.stock}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.trackingCount.toLocaleString("zh-TW")}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.favoriteCount.toLocaleString("zh-TW")}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.cartAddCount.toLocaleString("zh-TW")}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge ${hasSignal ? "bg-[#E4EDE4] text-[#3F5B41]" : "bg-oat-soft text-cocoa-soft"}`}>
                          {hasSignal ? "有需求訊號" : "尚無訊號"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="rounded-lg border border-mist bg-oat-soft/40 px-4 py-4 text-xs leading-relaxed text-cocoa-soft">
        追蹤與收藏是目前仍有效的會員數；會員關閉追蹤或移除收藏後，數字會隨之減少。加購為商品成效功能啟用後「成功加入購物袋」的累計次數，不代表目前購物袋內仍有該商品，也不追蹤個別會員。六入曲奇禮袋依三種口味共享庫存判斷；有任何可售規格的商品不列為缺貨。
      </aside>
    </div>
  );
}
