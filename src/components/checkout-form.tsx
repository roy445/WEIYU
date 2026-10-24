"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatDate, formatPrice } from "@/lib/brand";
import type { AvailableSlot } from "@/lib/settings";
import { SafeImage } from "./safe-image";
import { useStore } from "./store-provider";

type Props = {
  user: { name: string; email: string; phone: string | null };
  slots: AvailableSlot[];
  acceptingOrders: boolean;
};

type AvailableCoupon = {
  id: number;
  code: string;
  title: string;
  type: "fixed" | "percent";
  value: number;
  minimumSubtotal: number;
  expiresAt: string;
};

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutForm({ user, slots, acceptingOrders }: Props) {
  const router = useRouter();
  const { lines, subtotal, isReady, syncPrices, clearCart, toast } = useStore();
  const [contactName, setContactName] = useState(user.name);
  const [contactPhone, setContactPhone] = useState(user.phone ?? "");
  const [contactEmail] = useState(user.email);
  const [note, setNote] = useState("");
  const [locationId, setLocationId] = useState<number | null>(() => {
    const uniqueLocationIds = [...new Set(slots.map((slot) => slot.locationId))];
    return uniqueLocationIds.length === 1 ? uniqueLocationIds[0] : null;
  });
  const [date, setDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [synced, setSynced] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const requestId = useRef<string>(newRequestId());

  useEffect(() => {
    if (!isReady) return;
    void syncPrices().finally(() => setSynced(true));
  }, [isReady, syncPrices]);

  useEffect(() => {
    let active = true;
    void fetch("/api/account/rewards")
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          items?: AvailableCoupon[];
          points?: { balance: number };
        };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "無法讀取優惠券與點數。");
        if (!active) return;
        setAvailableCoupons(data.items ?? []);
        setPointsBalance(data.points?.balance ?? 0);
      })
      .catch((loadError) => {
        if (active) setRewardError(loadError instanceof Error ? loadError.message : "無法讀取優惠券與點數。");
      });
    return () => { active = false; };
  }, []);

  const selectedCoupon = availableCoupons.find((coupon) => coupon.id === selectedCouponId) ?? null;
  const couponDiscount = selectedCoupon && subtotal >= selectedCoupon.minimumSubtotal
    ? selectedCoupon.type === "percent"
      ? Math.floor((subtotal * selectedCoupon.value) / 100)
      : Math.min(subtotal, selectedCoupon.value)
    : 0;
  const maximumPoints = Math.max(0, subtotal - couponDiscount);
  const appliedPoints = Math.min(pointsToUse, pointsBalance, maximumPoints);
  const estimatedTotal = Math.max(0, subtotal - couponDiscount - appliedPoints);

  const locations = useMemo(() => {
    const map = new Map<number, { id: number; name: string; description: string | null; notes: string | null }>();
    for (const slot of slots) {
      if (!map.has(slot.locationId)) {
        map.set(slot.locationId, {
          id: slot.locationId,
          name: slot.locationName,
          description: slot.locationDescription,
          notes: slot.locationNotes,
        });
      }
    }
    return Array.from(map.values());
  }, [slots]);

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) if (slot.locationId === locationId) set.add(slot.pickupDate);
    return Array.from(set);
  }, [slots, locationId]);

  const slotOptions = useMemo(
    () => slots.filter((slot) => slot.locationId === locationId && slot.pickupDate === date),
    [slots, locationId, date],
  );

  const selectedLocation = locations.find((item) => item.id === locationId) ?? null;
  const selectedSlot = slots.find((slot) => slot.id === slotId) ?? null;
  const canSubmit =
    acceptingOrders &&
    slots.length > 0 &&
    lines.length > 0 &&
    !!selectedSlot &&
    selectedSlot.remaining > 0 &&
    (!selectedCoupon || subtotal >= selectedCoupon.minimumSubtotal) &&
    agree &&
    !pending;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedSlot) {
      setError("請選擇面交地點、日期與時段。");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })),
          pickupSlotId: selectedSlot.id,
          contactName,
          contactPhone,
          contactEmail,
          note,
          clientRequestId: requestId.current,
          userCouponId: selectedCouponId,
          pointsToUse: appliedPoints,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; orderId?: number; orderNo?: string; notificationSent?: boolean; notificationWarning?: string };
      if (!response.ok || !data.ok || !data.orderId) {
        setError(data.error ?? "訂單送出失敗，請稍後再試。");
        toast(data.error ?? "訂單送出失敗。", "error");
        if (response.status === 409) void syncPrices();
        return;
      }
      clearCart();
      toast(data.notificationWarning ?? `訂單 ${data.orderNo} 已送出，我會盡快確認。`, data.notificationWarning ? "info" : "success");
      const notification = data.notificationSent === true ? "sent" : data.notificationSent === false ? "failed" : "unknown";
      router.push(`/account/orders/${data.orderId}?placed=1&notification=${notification}`);
      router.refresh();
    } catch {
      setError("網路或伺服器發生問題，訂單尚未送出，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  if (!isReady) {
    return <div className="skeleton h-64 w-full" aria-busy="true" />;
  }

  if (lines.length === 0) {
    return (
      <div className="surface rounded-xl px-6 py-14 text-center animate-fade-in">
        <p className="font-serif text-2xl">購物袋還是空的</p>
        <p className="mt-2 text-sm text-cocoa-soft">先挑選喜歡的甜點，再回來預約面交。</p>
        <Link href="/products" className="btn btn-primary mt-6">
          探索甜點
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]" noValidate>
      <div className="space-y-10">
        {/* 商品明細 */}
        <section aria-labelledby="checkout-items">
          <h2 id="checkout-items" className="text-2xl">
            商品明細
          </h2>
          <ul className="mt-4 divide-y divide-mist/60 border-y border-mist/60">
            {lines.map((line) => (
              <li key={line.key} className="flex items-center gap-4 py-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-oat-soft">
                  <SafeImage src={line.imageUrl} alt={`${line.name} 示意圖`} sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-cocoa">{line.name}</p>
                  <p className="text-xs text-cocoa-soft">
                    {line.variantName ? `規格：${line.variantName} · ` : ""}
                    {formatPrice(line.unitPrice)} × {line.quantity}
                  </p>
                </div>
                <p className="text-sm text-cocoa">{formatPrice(line.unitPrice * line.quantity)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-cocoa-soft">
            {synced ? "已依目前庫存與價格重新核對。" : "正在核對庫存與價格…"} 如需調整數量，請回到購物袋。
          </p>
        </section>

        {/* 取貨人資訊 */}
        <section aria-labelledby="checkout-contact">
          <h2 id="checkout-contact" className="text-2xl">
            取貨人資訊
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="field-label">取貨人姓名</label>
              <input id="contact-name" className="field" value={contactName} onChange={(event) => setContactName(event.target.value)} required maxLength={40} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="contact-phone" className="field-label">聯絡電話</label>
              <input id="contact-phone" className="field" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder="方便面交聯繫的電話" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-email" className="field-label">電子郵件（會員帳號）</label>
              <input id="contact-email" className="field bg-oat-soft/60" value={contactEmail} readOnly />
            </div>
          </div>
        </section>

        {/* 面交預約 */}
        <section aria-labelledby="checkout-pickup">
          <h2 id="checkout-pickup" className="text-2xl">
            面交預約
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-mist/70 bg-cream-deep/60 px-4 py-3">
              <p className="text-[0.68rem] tracking-[0.2em] text-caramel-deep">取貨方式</p>
              <p className="mt-1 text-sm text-cocoa">面交取貨</p>
            </div>
            <div className="rounded-lg border border-mist/70 bg-cream-deep/60 px-4 py-3">
              <p className="text-[0.68rem] tracking-[0.2em] text-caramel-deep">付款方式</p>
              <p className="mt-1 text-sm text-cocoa">取貨時付款</p>
            </div>
          </div>

          {!acceptingOrders ? (
            <div className="mt-5 rounded-lg border border-[#D9B8AE] bg-[#FBF1EE] px-5 py-4 text-sm text-[#7C4234]">
              目前暫停接受新訂單，暫時無法送出訂單。購物袋內容會保留，歡迎稍後再回來。
            </div>
          ) : slots.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-mist px-5 py-6 text-sm text-cocoa-soft">
              目前尚未開放面交預約。等我設定好面交地點與時段後，這裡才會開放選擇並送出訂單。
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <fieldset>
                <legend className="field-label">面交地點</legend>
                <div className="grid gap-2">
                  {locations.map((location) => (
                    <label
                      key={location.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                        locationId === location.id ? "border-caramel bg-oat-soft/50" : "border-mist hover:border-caramel/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="location"
                        className="mt-1 accent-caramel"
                        checked={locationId === location.id}
                        onChange={() => {
                          setLocationId(location.id);
                          setDate(null);
                          setSlotId(null);
                        }}
                      />
                      <span>
                        <span className="block text-sm font-medium text-cocoa">{location.name}</span>
                        {location.description ? <span className="mt-0.5 block text-xs text-cocoa-soft">{location.description}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {locationId != null ? (
                <fieldset className="animate-fade-in">
                  <legend className="field-label">取貨日期</legend>
                  <div className="flex flex-wrap gap-2">
                    {dates.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setDate(value);
                          setSlotId(null);
                        }}
                        aria-pressed={date === value}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          date === value ? "border-caramel bg-caramel text-cream" : "border-mist text-cocoa hover:border-caramel"
                        }`}
                      >
                        {formatDate(value)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {date ? (
                <fieldset className="animate-fade-in">
                  <legend className="field-label">取貨時段</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {slotOptions.map((slot) => {
                      const full = slot.remaining <= 0;
                      return (
                        <label
                          key={slot.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                            full ? "cursor-not-allowed border-mist/60 text-cocoa-soft opacity-70" : slotId === slot.id ? "border-caramel bg-oat-soft/50" : "border-mist hover:border-caramel/60"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input type="radio" name="slot" className="accent-caramel" disabled={full} checked={slotId === slot.id} onChange={() => setSlotId(slot.id)} />
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="text-xs text-cocoa-soft">{full ? "已額滿" : `尚可預約 ${slot.remaining} 組`}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {selectedLocation?.notes ? (
                <p className="rounded-lg bg-oat-soft/60 px-4 py-3 text-xs leading-relaxed text-cocoa-soft animate-fade-in">
                  取貨注意事項：{selectedLocation.notes}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section aria-labelledby="checkout-note">
          <h2 id="checkout-note" className="text-2xl">
            訂單備註
          </h2>
          <textarea
            id="order-note"
            className="field mt-4 min-h-28"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="例如：需要分裝、過敏提醒或其他想告訴我的事（選填）"
            aria-label="訂單備註"
          />
        </section>
      </div>

      {/* 摘要 */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="surface rounded-xl p-6">
          <p className="eyebrow">Summary</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-cocoa-soft">商品小計</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="mt-4 border-t border-mist/70 pt-4">
              <label htmlFor="checkout-coupon" className="field-label">使用優惠券</label>
              <select
                id="checkout-coupon"
                className="field"
                value={selectedCouponId ?? ""}
                onChange={(event) => setSelectedCouponId(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">不使用優惠券</option>
                {availableCoupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.title}（{coupon.code}）
                  </option>
                ))}
              </select>
              {selectedCoupon && subtotal < selectedCoupon.minimumSubtotal ? (
                <p className="mt-1 text-xs text-[#8A4B3D]">此券需消費滿 NT${selectedCoupon.minimumSubtotal}；目前不符合使用條件。</p>
              ) : null}
              {selectedCoupon && couponDiscount > 0 ? (
                <p className="mt-1 text-xs text-cocoa-soft">優惠券折抵 −{formatPrice(couponDiscount)}</p>
              ) : null}
              {!availableCoupons.length && !rewardError ? <p className="mt-1 text-xs text-cocoa-soft">目前沒有可用優惠券。</p> : null}
              {rewardError ? <p role="alert" className="mt-1 text-xs text-[#8A4B3D]">{rewardError}</p> : null}
            </div>
            <div className="mt-4">
              <label htmlFor="checkout-points" className="field-label">使用點數（目前 {pointsBalance} 點，1 點折 NT$1）</label>
              <input
                id="checkout-points"
                className="field"
                type="number"
                min="0"
                max={Math.min(pointsBalance, maximumPoints)}
                step="1"
                value={appliedPoints}
                onChange={(event) => setPointsToUse(Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
              />
              <p className="mt-1 text-xs text-cocoa-soft">可與一張優惠券併用，點數折抵不超過折價後的商品小計。</p>
            </div>
            {couponDiscount > 0 ? (
              <div className="flex justify-between text-sm">
                <dt className="text-cocoa-soft">優惠券折抵</dt>
                <dd>−{formatPrice(couponDiscount)}</dd>
              </div>
            ) : null}
            {appliedPoints > 0 ? (
              <div className="flex justify-between text-sm">
                <dt className="text-cocoa-soft">點數折抵</dt>
                <dd>−{formatPrice(appliedPoints)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-cocoa-soft">運費</dt>
              <dd className="text-cocoa-soft">不適用（面交）</dd>
            </div>
            <div className="flex justify-between border-t border-mist/70 pt-3">
              <dt className="text-cocoa">訂單總金額</dt>
              <dd className="font-serif text-2xl text-cocoa">{formatPrice(estimatedTotal)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-cocoa-soft">總金額由伺服器依目前商品價格、優惠券與可用點數重新計算。訂單完成後依實付商品金額每滿 NT$50 回饋 1 點，不足 50 元無條件捨去。</p>

          <div className="mt-5 rounded-lg bg-cream-deep/80 px-4 py-3 text-xs leading-relaxed text-cocoa-soft">
            <p className="text-cocoa">
              {selectedSlot && selectedLocation
                ? `${selectedLocation.name} · ${formatDate(selectedSlot.pickupDate)} ${selectedSlot.startTime}–${selectedSlot.endTime}`
                : "尚未選擇面交時段"}
            </p>
            <p className="mt-1">送出後訂單狀態為「待店家確認」，我確認後會更新狀態。付款於面交取貨時進行，網站不會要求任何卡號或帳戶資訊。</p>
          </div>

          <label className="mt-5 flex items-start gap-3 text-sm text-cocoa">
            <input type="checkbox" className="mt-1 accent-caramel" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
            <span>我了解此訂單為面交取貨、取貨時付款，並會依約定時段前往取貨。</span>
          </label>

          <div aria-live="polite" className="mt-3 min-h-5">
            {error ? <p className="text-sm text-[#8A4B3D] animate-fade-in">{error}</p> : null}
          </div>

          <button type="submit" className="btn btn-primary mt-3 w-full" disabled={!canSubmit}>
            {pending ? "送出中…" : "送出訂單"}
          </button>
          <Link href="/products" className="mt-3 block text-center text-xs tracking-[0.1em] text-cocoa-soft hover:text-caramel-deep">
            繼續瀏覽甜點
          </Link>
        </div>
      </aside>
    </form>
  );
}
