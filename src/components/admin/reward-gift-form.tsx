"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

type GiftCoupon = {
  id: number;
  code: string;
  title: string;
  type: "fixed" | "percent" | "points";
  value: number;
  expiresAt: string;
  minimumSubtotal: number;
  maxDiscount: number | null;
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
  const [sendEmail, setSendEmail] = useState(false);
  const [emailReviewed, setEmailReviewed] = useState(false);
  const eligibleCoupons = coupons.filter((coupon) => coupon.isActive && new Date(coupon.expiresAt) > new Date());
  const selectedCoupon = eligibleCoupons.find((coupon) => coupon.id === Number(couponId));

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
    const result = await apiRequest<{ message?: string; emailSent?: number; emailFailed?: number }>("/api/admin/rewards/gift", {
      method: "POST",
      body: JSON.stringify({
        kind,
        audience,
        userId: audience === "member" ? member?.id : undefined,
        couponId: kind === "coupon" ? Number(couponId) : undefined,
        pointsAmount: kind === "points" ? Number(pointsAmount) : undefined,
        sendEmail: kind === "coupon" && sendEmail,
        emailReviewed: kind === "coupon" && emailReviewed,
      }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "贈送失敗，請稍後再試。");
      return;
    }
    toast(result.data.message ?? "贈送完成，站內通知已送達。", result.data.emailFailed ? "error" : "success");
    setPointsAmount("");
    setQuery("");
    setMember(null);
    setMembers([]);
    setSendEmail(false);
    setEmailReviewed(false);
  };

  return (
    <section className="surface rounded-xl p-5 sm:p-7" aria-labelledby="reward-gift-heading">
      <p className="eyebrow">Member rewards</p>
      <h2 id="reward-gift-heading" className="mt-2 text-2xl">贈送甜甜數或優惠券</h2>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">
        只可贈送已建立且有效的優惠券；每位收件會員會占用一個領取上限。贈送後會有站內通知；如要另外寄送優惠券提醒 Email，請先勾選、審閱預覽並確認。直接贈送的甜甜數及甜甜數券皆為取得日起 3 個月到期。
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">贈送內容</span>
          <select className="field" value={kind} onChange={(event) => { setKind(event.target.value as typeof kind); setEmailReviewed(false); }}>
            <option value="points">直接贈送甜甜數</option>
            <option value="coupon">贈送已建立的優惠券</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">贈送對象</span>
          <select className="field" value={audience} onChange={(event) => { setAudience(event.target.value as typeof audience); setMember(null); setQuery(""); setEmailReviewed(false); }}>
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
                  onChange={(event) => { setMember(null); setMembers([]); setQuery(event.target.value); setEmailReviewed(false); }}
              placeholder="至少輸入 2 個字"
              autoComplete="off"
              required
            />
            {query.trim().length >= 2 && members.length ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-mist bg-cream shadow-lg">
                {members.map((candidate) => (
                  <li key={candidate.id}>
                    <button type="button" className="w-full px-4 py-3 text-left text-sm hover:bg-oat-soft" onClick={() => { setMember(candidate); setQuery(""); setMembers([]); setEmailReviewed(false); }}>
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
            <select className="field" value={couponId} onChange={(event) => { setCouponId(event.target.value); setEmailReviewed(false); }} required>
              <option value="">請選擇優惠券</option>
              {eligibleCoupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id} disabled={coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions}>
                  {coupon.title}（{coupon.code}）{coupon.maxRedemptions !== null ? ` · 剩餘 ${Math.max(0, coupon.maxRedemptions - coupon.redemptionCount)}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "coupon" ? (
          <div className="md:col-span-2 space-y-3 rounded-lg border border-mist/70 p-4">
            <label className="flex items-start gap-3 text-sm text-cocoa">
              <input type="checkbox" checked={sendEmail} onChange={(event) => { setSendEmail(event.target.checked); setEmailReviewed(false); }} className="mt-1 accent-caramel" />
              詢問並確認後，另外寄送優惠券提醒 Email（取消勾選則只送站內通知）
            </label>
            {sendEmail && selectedCoupon ? (
              <div className="space-y-3">
                <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-mist bg-[#fffdf8]">
                  <div className="border-b border-mist bg-cream-deep/40 px-4 py-3 text-xs text-cocoa-soft">Email 主旨：{selectedCoupon.type === "points" ? "你收到甜甜數贈禮" : "你收到優惠券"}｜{selectedCoupon.title} · 收件對象：{audience === "all" ? "符合資格的會員（可能含未驗證 Email）" : member ? `${member.name}（${member.email}）` : "請先選擇會員"}</div>
                  <div className="p-5">
                    <div className="border-b border-mist pb-3 text-center">
                      <Image src="/brand/email-logo.png" alt="WEIYU 唯遇甜所" width={76} height={76} className="mx-auto h-16 w-16 object-contain" />
                      <p className="mt-2 font-serif text-xs tracking-[0.2em] text-caramel-deep">WEIYU 唯遇甜所</p>
                    </div>
                    <h3 className="mt-4 font-serif text-xl text-cocoa">{selectedCoupon.type === "points" ? "一份甜甜數心意，已放入你的帳戶" : "一份甜點小心意，送給你"}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">{selectedCoupon.type === "points" ? `店家送你的 ${selectedCoupon.value} 點甜甜數已加入帳戶。登入會員中心即可查看點數餘額與使用期限。` : `親愛的甜點好友，店家已將「${selectedCoupon.title}」放入你的會員帳戶。${selectedCoupon.type === "fixed" ? `可折抵 NT$${selectedCoupon.value}。` : `可享 ${selectedCoupon.value}% 折扣，最高折抵 NT$${selectedCoupon.maxDiscount ?? 1000000}。`}${selectedCoupon.minimumSubtotal > 0 ? ` 消費滿 NT$${selectedCoupon.minimumSubtotal} 可使用。` : ""} 請於 ${new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "long" }).format(new Date(selectedCoupon.expiresAt))} 前使用。`}</p>
                    <p className="mt-4 rounded-full bg-caramel px-4 py-2 text-center text-sm text-cream">{selectedCoupon.type === "points" ? "查看我的甜甜數" : "查看我的優惠券"}</p>
                    {selectedCoupon.type === "points" ? null : <p className="mt-3 text-xs leading-relaxed text-cocoa-soft">優惠券已直接放入帳戶，結帳時請在「使用優惠券」選擇，不需要手動輸入代碼。優惠券代碼：{selectedCoupon.code}</p>}
                    <p className="mt-4 border-t border-mist pt-3 text-xs leading-relaxed text-cocoa-soft">此郵件由 WEIYU 唯遇甜所自動寄出。若有疑問，請透過網站聯絡方式與我們聯繫。</p>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm leading-relaxed text-cocoa">
                  <input type="checkbox" checked={emailReviewed} onChange={(event) => setEmailReviewed(event.target.checked)} className="mt-1 accent-caramel" />
                  我已審閱獎勵 Email 格式、內容與收件對象，確認要在贈送後寄出；變更內容或對象後需重新確認。
                </label>
                {audience === "all" ? <p className="text-xs text-cocoa-soft">全體收件對象可能包含未驗證 Email 帳號；寄送只會在此表單確認送出時發生。</p> : null}
              </div>
            ) : sendEmail ? <p className="text-xs text-cocoa-soft">請先選擇有效優惠券，系統才可顯示完整 Email 預覽。</p> : null}
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-[#8A4B3D] md:col-span-2">{error}</p> : null}
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || (audience === "member" && !member) || (kind === "coupon" && !couponId) || (kind === "coupon" && sendEmail && !emailReviewed)} className="btn btn-primary">
            {pending ? "贈送中…" : "確認贈送並通知會員"}
          </button>
        </div>
      </form>
    </section>
  );
}
