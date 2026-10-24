"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatDate } from "@/lib/brand";
import type { CouponDisplay } from "./coupon-ticket";
import { CouponTicket } from "./coupon-ticket";
import { useStore } from "./store-provider";

type Props = {
  items: CouponDisplay[];
  points: {
    balance: number;
    expiringWithin30Days: number;
    lots: { id: number; remaining: number; source: string; expiresAt: Date }[];
  };
};

export function CouponCenter({ items, points: initialPoints }: Props) {
  const router = useRouter();
  const { toast } = useStore();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "兌換失敗，請確認代碼。");
        return;
      }
      setCode("");
      toast(data.message ?? "優惠券已兌換。");
      router.refresh();
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
      <aside className="space-y-5">
        <section className="surface rounded-xl p-6">
          <p className="eyebrow">Sweet points</p>
          <div className="mt-3 flex items-center gap-3">
            <svg viewBox="0 0 32 32" className="h-12 w-12 text-caramel" fill="none" aria-hidden="true">
              <path d="M5 22c0-3 3-5 7-5h9c4 0 6 2 6 5v2H5v-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="m11 17 8-8 7 3-5 6M12 16c-1-3 0-6 3-8l4 1M8 24h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="23" cy="22" r="5" fill="#fbf7f0" stroke="currentColor" strokeWidth="1.6" />
              <path d="m23 19.5.8 1.7 1.9.2-1.4 1.2.4 1.8-1.7-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2.8-1.7Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <p className="font-serif text-4xl text-cocoa">{initialPoints.balance}<span className="ml-2 text-base">甜甜數</span></p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-cocoa-soft">每 1 點甜甜數折 NT$1，可於結帳選擇使用數量。甜甜數自取得日起 3 個月到期。{initialPoints.expiringWithin30Days > 0 ? `其中 ${initialPoints.expiringWithin30Days} 點將於 30 天內到期。` : ""}</p>
          {initialPoints.lots.length ? (
            <ul className="mt-4 space-y-2 border-t border-mist/60 pt-3 text-xs text-cocoa-soft">
              {initialPoints.lots.map((lot) => (
                <li key={lot.id} className="flex justify-between gap-3">
                  <span>{lot.source === "coupon" ? "優惠券取得" : "消費回饋"} · {lot.remaining} 甜甜數</span>
                  <span>到期 {formatDate(lot.expiresAt)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <form onSubmit={claim} className="surface rounded-xl p-6">
          <p className="eyebrow">Redeem your code</p>
          <h2 className="mt-2 text-2xl">輸入優惠券代碼</h2>
          <label htmlFor="coupon-code" className="field-label mt-4">優惠券代碼</label>
          <input id="coupon-code" className="field uppercase" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={32} autoComplete="off" required />
          {error ? <p role="alert" className="mt-2 text-xs text-[#8A4B3D]">{error}</p> : null}
          <button className="btn btn-primary mt-4 w-full" disabled={pending || !code.trim()}>{pending ? "兌換中…" : "領取優惠券"}</button>
        </form>
      </aside>
      <section aria-labelledby="available-coupons">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Coupon collection</p>
            <h2 id="available-coupons" className="mt-2 text-2xl">我的優惠券</h2>
          </div>
          <span className="badge bg-oat-soft text-cocoa">{items.length} 張可使用</span>
        </div>
        {items.length ? (
          <div className="mt-4 grid gap-4">
            {items.map((coupon) => <CouponTicket key={coupon.id} coupon={coupon} />)}
          </div>
        ) : (
          <div className="surface mt-4 rounded-xl px-6 py-12 text-center">
            <p className="font-serif text-xl">目前沒有可用優惠券</p>
            <p className="mt-2 text-sm text-cocoa-soft">輸入店家提供的優惠券代碼即可領取。</p>
          </div>
        )}
      </section>
    </div>
  );
}
