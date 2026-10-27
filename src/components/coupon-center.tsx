"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CouponDisplay } from "./coupon-ticket";
import { CouponTicket } from "./coupon-ticket";
import { useStore } from "./store-provider";

type Props = {
  items: CouponDisplay[];
};

export function CouponCenter({ items }: Props) {
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
      <aside>
        <form onSubmit={claim} className="surface rounded-xl p-6">
          <p className="eyebrow">Redeem a coupon</p>
          <h2 className="mt-2 text-2xl">兌換優惠券代碼</h2>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">店家直接贈送的優惠券會自動列在右側，結帳時選取即可，不需要輸入代碼。下方欄位只用於兌換店家另外提供的代碼券。</p>
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
            <h2 id="available-coupons" className="mt-2 text-2xl">可使用的優惠券</h2>
          </div>
          <span className="badge bg-oat-soft text-cocoa">{items.length} 張</span>
        </div>
        {items.length ? (
          <ul className="mt-4 grid gap-4">
            {items.map((coupon) => <li key={coupon.id}><CouponTicket coupon={coupon} /></li>)}
          </ul>
        ) : (
          <div className="surface mt-4 rounded-xl px-6 py-12 text-center">
            <p className="font-serif text-xl">目前沒有可用優惠券</p>
            <p className="mt-2 text-sm text-cocoa-soft">店家贈送或你兌換的可用優惠券會列在這裡。</p>
          </div>
        )}
      </section>
    </div>
  );
}
