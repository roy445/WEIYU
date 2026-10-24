import { formatDate, formatPrice } from "@/lib/brand";
import { LogoMark } from "./logo";

export type CouponDisplay = {
  id: number;
  code: string;
  title: string;
  type: string;
  value: number;
  minimumSubtotal: number;
  expiresAt: Date;
};

export function CouponTicket({ coupon }: { coupon: CouponDisplay }) {
  const benefit = coupon.type === "percent"
    ? `${coupon.value}% OFF`
    : coupon.type === "points"
      ? `${coupon.value} 甜甜數`
      : `折抵 ${formatPrice(coupon.value)}`;

  return (
    <article className="coupon-ticket relative overflow-hidden rounded-xl border border-caramel/80 bg-[#fffaf2] p-5 text-cocoa shadow-sm sm:p-6">
      <span aria-hidden="true" className="coupon-ticket-notch -left-3" />
      <span aria-hidden="true" className="coupon-ticket-notch -right-3" />
      <div className="pointer-events-none absolute inset-[7px] rounded-lg border border-caramel/35" />
      <div className="pointer-events-none absolute right-8 top-5 flex items-center gap-2 text-caramel-deep/70">
        <LogoMark className="h-8 w-5" strokeWidth={2} />
        <span className="font-serif text-[0.6rem] tracking-[0.3em]">WEIYU</span>
      </div>
      <div className="relative grid min-h-36 gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="hidden text-caramel/75 sm:block">
            <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
              <path d="M10 46c8-7 15-11 25-12 5-.5 11 1 19 5M18 39l-1-18 13-9 17 11-2 17M18 27l28-4M20 34l25-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 47h42M24 17l7-5 8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="50" cy="44" r="9" fill="#fffaf2" stroke="currentColor" strokeWidth="1.5" />
              <path d="m50 38 1.7 3.8 4.1.4-3.1 2.7.9 4-3.6-2.1-3.5 2.1.8-4-3-2.7 4-.4L50 38Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[0.62rem] tracking-[0.3em] text-caramel-deep">甜點優惠券</p>
            <h3 className="mt-2 font-serif text-xl sm:text-2xl">{coupon.title}</h3>
            <p className="mt-1 text-xs tracking-[0.12em] text-cocoa-soft">代碼：{coupon.code}</p>
          </div>
        </div>
        <div className="border-t border-dashed border-caramel/50 pt-3 text-left sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
          <p className="font-serif text-2xl tracking-[0.08em] text-caramel-deep sm:text-3xl">{benefit}</p>
          {coupon.minimumSubtotal > 0 ? <p className="mt-1 text-xs text-cocoa-soft">消費滿 {formatPrice(coupon.minimumSubtotal)} 可用</p> : null}
          <p className="mt-2 text-[0.68rem] tracking-[0.1em] text-cocoa-soft">使用期限｜{formatDate(coupon.expiresAt)}</p>
        </div>
      </div>
    </article>
  );
}
