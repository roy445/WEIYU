import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/brand";
import { getPointsHistory, getPointsSummary } from "@/lib/rewards";

export const metadata: Metadata = { title: "我的甜甜數" };
export const dynamic = "force-dynamic";

function historyLabel(kind: string) {
  if (kind === "earned") return "獲得";
  if (kind === "spent") return "折抵";
  if (kind === "restored") return "回補";
  if (kind === "expired") return "到期";
  return "調整";
}

export default async function PointsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/points");

  const now = new Date();
  const [points, history] = await Promise.all([
    getPointsSummary(user.id, now),
    getPointsHistory(user.id, now),
  ]);

  return (
    <div className="container-wy py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Sweet points</p>
          <h1 className="mt-3 text-4xl">我的甜甜數</h1>
          <p className="mt-2 max-w-2xl text-sm text-cocoa-soft">甜甜數與優惠券分開管理。每 1 點可折抵 NT$1，結帳時可在套用優惠券後選擇折抵點數。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/account/coupons" className="btn btn-secondary btn-sm">前往優惠券</Link>
          <Link href="/account" className="btn btn-secondary btn-sm">回會員中心</Link>
        </div>
      </div>

      <section aria-label="甜甜數總覽" className="surface mt-8 flex flex-wrap items-center justify-between gap-5 rounded-xl p-6 sm:p-8">
        <div>
          <p className="eyebrow">Available balance</p>
          <p className="mt-3 flex items-baseline gap-2 font-serif text-5xl text-[#356b46]">
            {points.balance}<span className="text-base">點可用</span>
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cocoa-soft">每筆完成訂單依折抵後的實付商品金額，每滿 NT$50 回饋 1 點，未滿 50 元的部分無條件捨去。點數自取得日起 3 個月到期。</p>
        </div>
        <div className="min-w-40 rounded-lg border border-[#d7e4d9] bg-[#f2f7f2] px-5 py-4 text-center">
          <p className="text-xs text-cocoa-soft">30 天內到期</p>
          <p className="mt-1 font-serif text-2xl text-[#356b46]">{points.expiringWithin30Days} 點</p>
        </div>
      </section>

      <section aria-labelledby="points-history-heading" className="surface mt-6 rounded-xl p-6 sm:p-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Point history</p>
            <h2 id="points-history-heading" className="mt-2 text-2xl">甜甜數歷程</h2>
            <p className="mt-1 text-sm text-cocoa-soft">包含獲得、訂單折抵、取消回補、店家調整及到期失效；最新紀錄排在最前面。</p>
          </div>
          <span className="badge bg-oat-soft text-cocoa">{history.length} 筆</span>
        </div>

        {history.length ? (
          <ol className="mt-5 divide-y divide-mist/70">
            {history.map((entry) => {
              const isPositive = entry.amount > 0;
              const positiveClass = "border-[#c8dccb] bg-[#f1f7f2] text-[#356b46]";
              const neutralClass = "border-mist bg-cream-deep/40 text-cocoa-soft";
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${isPositive ? positiveClass : neutralClass}`}>{historyLabel(entry.kind)}</span>
                      <h3 className="text-sm font-medium text-cocoa">{entry.title}</h3>
                    </div>
                    <p className="mt-2 text-xs text-cocoa-soft">{formatDateTime(entry.occurredAt)}{entry.description ? `｜${entry.description}` : ""}</p>
                  </div>
                  <p className={`shrink-0 font-serif text-xl ${isPositive ? "text-[#356b46]" : "text-cocoa-soft"}`}>
                    {isPositive ? "+" : ""}{entry.amount} 點
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-mist px-5 py-10 text-center">
            <p className="font-serif text-lg">目前沒有甜甜數歷程</p>
            <p className="mt-2 text-sm text-cocoa-soft">完成訂單或取得店家贈點後，所有點數異動會依時間列在這裡。</p>
          </div>
        )}
      </section>
    </div>
  );
}
