"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

type GiftCoupon = {
  id: number;
  code: string;
  title: string;
  type: "fixed" | "percent" | "points";
  value: number;
  expiresAt: string;
  isActive: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
};

type MemberResult = { id: number; name: string; email: string };

export function RewardGiftForm({ coupons }: { coupons: GiftCoupon[] }) {
  const { toast } = useStore();
  const [kind, setKind] = useState<"points" | "coupon">("points");
  const [audience, setAudience] = useState<"member" | "all">("member");
  const [pointsAmount, setPointsAmount] = useState("");
  const [couponId, setCouponId] = useState("");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberResult[]>([]);
  const [member, setMember] = useState<MemberResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligibleCoupons = coupons.filter((coupon) => coupon.isActive && new Date(coupon.expiresAt) > new Date());

  useEffect(() => {
    if (audience !== "member" || query.trim().length < 2 || member?.name === query) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void apiRequest<{ members?: MemberResult[] }>(`/api/admin/members/search?q=${encodeURIComponent(query)}`, { method: "GET" })
        .then((result) => {
          if (!active) return;
          if (result.ok) setMembers(result.data.members ?? []);
          else setError(result.data.error ?? "無法搜尋會員。");
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [audience, member, query]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await apiRequest<{ message?: string }>("/api/admin/rewards/gift", {
      method: "POST",
      body: JSON.stringify({
        kind,
        audience,
        userId: audience === "member" ? member?.id : undefined,
        couponId: kind === "coupon" ? Number(couponId) : undefined,
        pointsAmount: kind === "points" ? Number(pointsAmount) : undefined,
      }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "贈送失敗，請稍後再試。");
      return;
    }
    toast(result.data.message ?? "贈送完成，站內通知已送達。");
    setPointsAmount("");
    setQuery("");
    setMember(null);
    setMembers([]);
  };

  return (
    <section className="surface rounded-xl p-5 sm:p-7" aria-labelledby="reward-gift-heading">
      <p className="eyebrow">Member rewards</p>
      <h2 id="reward-gift-heading" className="mt-2 text-2xl">贈送甜甜數或優惠券</h2>
      <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">
        只可贈送已建立且有效的優惠券；每位收件會員會占用一個領取上限。收件者會收到會員中心站內通知，不會寄送 Email。直接贈送的甜甜數及甜甜數券皆為取得日起 3 個月到期。
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">贈送內容</span>
          <select className="field" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="points">直接贈送甜甜數</option>
            <option value="coupon">贈送已建立的優惠券</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">贈送對象</span>
          <select className="field" value={audience} onChange={(event) => { setAudience(event.target.value as typeof audience); setMember(null); setQuery(""); }}>
            <option value="member">指定單一會員</option>
            <option value="all">全體會員</option>
          </select>
        </label>
        {audience === "member" ? (
          <div className="relative">
            <label htmlFor="gift-member-search" className="field-label">搜尋會員姓名或 Email</label>
            <input
              id="gift-member-search"
              className="field"
              value={member ? `${member.name} (${member.email})` : query}
                  onChange={(event) => { setMember(null); setMembers([]); setQuery(event.target.value); }}
              placeholder="至少輸入 2 個字"
              autoComplete="off"
              required
            />
            {query.trim().length >= 2 && members.length ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-mist bg-cream shadow-lg">
                {members.map((candidate) => (
                  <li key={candidate.id}>
                    <button type="button" className="w-full px-4 py-3 text-left text-sm hover:bg-oat-soft" onClick={() => { setMember(candidate); setQuery(""); setMembers([]); }}>
                      <span className="block font-medium">{candidate.name}</span>
                      <span className="text-xs text-cocoa-soft">{candidate.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {query.trim().length >= 2 && !member && members.length === 0 ? <p className="mt-1 text-xs text-cocoa-soft">搜尋會員中，或找不到符合的會員。</p> : null}
          </div>
        ) : (
          <p className="self-end text-xs text-cocoa-soft">將贈送給目前所有尚未領取此優惠券的會員；直接贈送甜甜數則會發給全體會員。</p>
        )}
        {kind === "points" ? (
          <label className="block">
            <span className="field-label">贈送甜甜數</span>
            <input className="field" type="number" min="1" max="1000000" step="1" value={pointsAmount} onChange={(event) => setPointsAmount(event.target.value)} required />
          </label>
        ) : (
          <label className="block">
            <span className="field-label">選擇已建立的有效優惠券</span>
            <select className="field" value={couponId} onChange={(event) => setCouponId(event.target.value)} required>
              <option value="">請選擇優惠券</option>
              {eligibleCoupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id} disabled={coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions}>
                  {coupon.title}（{coupon.code}）{coupon.maxRedemptions !== null ? ` · 剩餘 ${Math.max(0, coupon.maxRedemptions - coupon.redemptionCount)}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {error ? <p role="alert" className="text-sm text-[#8A4B3D] md:col-span-2">{error}</p> : null}
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || (audience === "member" && !member) || (kind === "coupon" && !couponId)} className="btn btn-primary">
            {pending ? "贈送中…" : "確認贈送並通知會員"}
          </button>
        </div>
      </form>
    </section>
  );
}
