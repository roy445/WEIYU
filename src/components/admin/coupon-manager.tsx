"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatDateTime, formatPrice } from "@/lib/brand";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

type CouponRow = {
  id: number;
  code: string;
  title: string;
  type: "fixed" | "percent" | "points";
  value: number;
  minimumSubtotal: number;
  expiresAt: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  isActive: boolean;
  claimedCount: number;
};

const defaultExpiry = () => {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export function CouponManager() {
  const { toast } = useStore();
  const [items, setItems] = useState<CouponRow[]>([]);
  const [type, setType] = useState<CouponRow["type"]>("fixed");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [expiry, setExpiry] = useState(defaultExpiry);

  const load = () => apiRequest<{ items?: CouponRow[] }>("/api/admin/coupons", { method: "GET" })
    .then((result) => {
      if (!result.ok) {
        setError(result.data.error ?? "無法讀取優惠券。");
        return;
      }
      setItems(result.data.items ?? []);
    });

  useEffect(() => {
    let active = true;
    void apiRequest<{ items?: CouponRow[] }>("/api/admin/coupons", { method: "GET" }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(result.data.error ?? "無法讀取優惠券。");
        return;
      }
      setItems(result.data.items ?? []);
    });
    return () => { active = false; };
  }, []);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const maxValue = String(formData.get("maxRedemptions") ?? "").trim();
    const result = await apiRequest("/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: formData.get("code"),
        title: formData.get("title"),
        type,
        value: Number(formData.get("value")),
        minimumSubtotal: Number(formData.get("minimumSubtotal") || 0),
        maxRedemptions: maxValue ? Number(maxValue) : null,
        expiresAt: new Date(expiry).toISOString(),
      }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "建立優惠券失敗。");
      return;
    }
    form.reset();
    setExpiry(defaultExpiry());
    toast("優惠券已建立。");
    await load();
  };

  const toggle = async (coupon: CouponRow) => {
    const result = await apiRequest(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    if (!result.ok) {
      toast(result.data.error ?? "更新優惠券失敗。", "error");
      return;
    }
    toast(result.data.message ?? "優惠券狀態已更新。");
    await load();
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={create} className="surface h-fit space-y-4 rounded-xl p-5 sm:p-7">
        <div>
          <p className="eyebrow">Create coupon</p>
          <h2 className="mt-2 text-2xl">新增優惠券</h2>
        </div>
        <label className="block"><span className="field-label">優惠券代碼</span><input name="code" className="field uppercase" minLength={6} maxLength={32} pattern="[A-Za-z0-9_-]{6,32}" required placeholder="例如 SWEET2026" /></label>
        <label className="block"><span className="field-label">券面名稱</span><input name="title" className="field" maxLength={80} minLength={2} required placeholder="例如 新會員甜點折價券" /></label>
        <label className="block">
          <span className="field-label">優惠類型</span>
          <select className="field" value={type} onChange={(event) => setType(event.target.value as CouponRow["type"])}>
            <option value="fixed">折價金額（元）</option><option value="percent">百分比折扣（%）</option><option value="points">點數（點）</option>
          </select>
        </label>
        <label className="block"><span className="field-label">{type === "fixed" ? "折抵金額（元）" : type === "percent" ? "折扣百分比（1–100）" : "贈送點數"}</span><input name="value" className="field" type="number" min="1" max={type === "percent" ? 100 : 1000000} step="1" required /></label>
        {type !== "points" ? <label className="block"><span className="field-label">最低消費金額（元）</span><input name="minimumSubtotal" className="field" type="number" min="0" step="1" defaultValue="0" /></label> : null}
        <label className="block"><span className="field-label">優惠券到期時間（由店家設定）</span><input className="field" type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} required /></label>
        <label className="block"><span className="field-label">可領取總數（留空不限量）</span><input name="maxRedemptions" className="field" type="number" min="1" step="1" placeholder="不限量" /></label>
        {error ? <p role="alert" className="text-sm text-[#8A4B3D]">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "建立中…" : "建立優惠券"}</button>
        <p className="text-xs leading-relaxed text-cocoa-soft">百分比折扣依訂單小計計算，折扣金額無條件捨去至整數元。顧客每筆訂單可使用一張優惠券，並可另外使用點數。</p>
      </form>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div><p className="eyebrow">Coupons</p><h2 className="mt-2 text-2xl">已建立的優惠券</h2></div>
          <span className="badge bg-oat-soft text-cocoa">{items.length} 組</span>
        </div>
        {items.length ? (
          <ul className="mt-4 space-y-3">
            {items.map((coupon) => (
              <li key={coupon.id} className="surface flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{coupon.title} <span className="ml-2 font-mono text-xs text-caramel-deep">{coupon.code}</span></p>
                  <p className="mt-1 text-xs text-cocoa-soft">
                    {coupon.type === "fixed" ? `折 ${formatPrice(coupon.value)}` : coupon.type === "percent" ? `${coupon.value}% 折扣` : `${coupon.value} 點`}
                    {coupon.minimumSubtotal > 0 ? ` · 滿 ${formatPrice(coupon.minimumSubtotal)} 可用` : ""}
                    {" · "}已領取 {coupon.claimedCount}{coupon.maxRedemptions == null ? " 張" : ` / ${coupon.maxRedemptions} 張`}
                  </p>
                  <p className="mt-1 text-xs text-cocoa-soft">到期 {formatDateTime(new Date(coupon.expiresAt))}</p>
                </div>
                <button type="button" className={`btn btn-sm ${coupon.isActive ? "btn-secondary" : "btn-primary"}`} onClick={() => void toggle(coupon)}>
                  {coupon.isActive ? "停用" : "重新啟用"}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="surface mt-4 rounded-xl px-5 py-10 text-center text-sm text-cocoa-soft">尚未建立優惠券。</p>}
      </section>
    </div>
  );
}
