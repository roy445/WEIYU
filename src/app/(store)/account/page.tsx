import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { LogoutButton } from "@/components/auth-forms";
import { PasswordForm } from "@/components/password-form";
import { ProfileForm } from "@/components/profile-form";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { CouponTicket, type CouponDisplay } from "@/components/coupon-ticket";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableCoupons, getPointsBalance } from "@/lib/rewards";
import { formatDate, formatDateTime, formatPrice } from "@/lib/brand";
import { formatMembershipSpend, getMembershipTier } from "@/lib/membership";

export const metadata: Metadata = { title: "會員中心" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  let myOrders: (typeof orders.$inferSelect)[] = [];
  let loadError = false;
  let pointsError = false;
  let couponsError = false;
  let pointsBalance = 0;
  let availableCoupons: CouponDisplay[] = [];
  const [ordersResult, pointsResult, couponsResult] = await Promise.allSettled([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)),
    getPointsBalance(user.id),
    getAvailableCoupons(user.id),
  ]);
  if (ordersResult.status === "fulfilled") myOrders = ordersResult.value;
  else loadError = true;
  if (pointsResult.status === "fulfilled") pointsBalance = pointsResult.value;
  else pointsError = true;
  if (couponsResult.status === "fulfilled") availableCoupons = couponsResult.value;
  else couponsError = true;
  const completedSpend = myOrders
    .filter((order) => order.status === "completed")
    .reduce((total, order) => total + order.total, 0);
  const membership = getMembershipTier(completedSpend);

  return (
    <div className="container-wy py-12 md:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <p className="eyebrow">Member</p>
          <h1 className="mt-4 text-4xl">會員中心</h1>
          <p className="mt-2 text-sm text-cocoa-soft">你好，{user.name}。這裡可以查看訂單進度與更新聯絡資料。</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link href="/account/favorites" className="btn btn-secondary btn-sm">我的收藏</Link>
          <Link href="/account/points" className="btn btn-secondary btn-sm">甜甜數 {pointsError ? "" : pointsBalance}</Link>
          <Link href="/account/coupons" className="btn btn-secondary btn-sm">優惠券</Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="btn btn-dark btn-sm">
              前往管理後台
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <section aria-labelledby="account-points-heading" className="surface rounded-lg p-6 sm:p-7">
          <p className="eyebrow">Sweet points</p>
          <h2 id="account-points-heading" className="mt-2 text-2xl">甜甜數</h2>
          <p className="mt-4 flex items-baseline gap-2 font-serif text-4xl text-[#356b46]">
            {pointsError ? <span className="text-base text-cocoa-soft">暫時無法讀取</span> : <>{pointsBalance}<span className="text-sm">點可用</span></>}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">甜甜數獨立累積，可在結帳時折抵；批次來源與到期日請至甜甜數專頁查看。</p>
          <Link href="/account/points" className="btn btn-secondary btn-sm mt-5">查看甜甜數明細</Link>
        </section>

        <section aria-labelledby="account-coupons-heading" className="surface rounded-lg p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Coupon collection</p>
              <h2 id="account-coupons-heading" className="mt-2 text-2xl">優惠券列表</h2>
            </div>
            <Link href="/account/coupons" className="text-sm text-caramel-deep underline underline-offset-4">查看與兌換優惠券</Link>
          </div>
          {couponsError ? (
            <p className="mt-4 rounded-lg border border-[#ded1bd] bg-[#f7f2eb] px-5 py-4 text-sm text-[#6c5840]">優惠券暫時無法讀取，請稍後重新整理。</p>
          ) : availableCoupons.length ? (
            <ul className="mt-4 grid gap-4">
              {availableCoupons.map((coupon) => <li key={coupon.id}><CouponTicket coupon={coupon} /></li>)}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-mist px-5 py-8 text-center">
              <p className="font-serif text-lg">目前沒有可用優惠券</p>
              <p className="mt-2 text-sm text-cocoa-soft">已領取且尚未到期的優惠券會顯示在這裡。</p>
            </div>
          )}
        </section>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="text-2xl">
            我的訂單
          </h2>
          {loadError ? (
            <p className="mt-4 rounded-lg border border-[#ded1bd] bg-[#f7f2eb] px-5 py-4 text-sm text-[#6c5840]">
              目前無法讀取訂單資料，請稍後再試。
            </p>
          ) : myOrders.length === 0 ? (
            <div className="surface mt-4 rounded-lg px-6 py-12 text-center">
              <p className="font-serif text-xl">還沒有訂單</p>
              <p className="mt-2 text-sm text-cocoa-soft">挑一份甜點，預約一次面交吧。</p>
              <Link href="/products" className="btn btn-primary mt-6">
                探索甜點
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {myOrders.map((order, index) => (
                <li key={order.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="surface flex flex-col gap-3 rounded-lg px-5 py-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-caramel/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-serif text-lg text-cocoa">訂單 {order.orderNo}</p>
                      <p className="mt-1 text-xs text-cocoa-soft">
                        {formatDateTime(order.createdAt)} · 面交 {formatDate(order.pickupDate)} {order.pickupTime} · {order.pickupLocationName}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <span className="ml-1 font-serif text-lg">{formatPrice(order.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="profile-heading" className="surface rounded-lg p-6">
            <h2 id="profile-heading" className="text-2xl">
              會員資料
            </h2>
            <p className="mt-1 text-xs text-cocoa-soft">結帳時會自動帶入，面交時我會以此聯繫你。</p>
            <div className="mt-4 rounded-lg border border-mist/60 bg-cream-deep/40 p-4 text-sm">
              <p>加入日期：{formatDateTime(user.createdAt)}</p>
              <p className="mt-1">會員等級：{membership.current.name}</p>
              <p className="mt-1 text-xs text-cocoa-soft">
                已完成訂單累積消費 {formatMembershipSpend(completedSpend)}
                {membership.next ? `，再消費 ${formatMembershipSpend(membership.remainingSpend)} 可升級為「${membership.next.name}」` : "，已達最高等級"}
              </p>
              <Link href="/membership" className="mt-2 inline-block text-xs text-caramel-deep underline underline-offset-4">查看會員等級制度</Link>
            </div>
            <div className="mt-5">
              <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone, theme: user.theme, avatarColor: user.avatarColor, avatarUrl: user.avatarUrl }} />
            </div>
          </section>

          <section aria-labelledby="password-heading" className="surface rounded-lg p-6">
            <h2 id="password-heading" className="text-2xl">
              變更密碼
            </h2>
            <p className="mt-1 text-xs text-cocoa-soft">
              {user.role === "admin" ? "管理員帳號請使用較長的密碼，並在收到初始密碼後立即更換。" : "建議定期更換，並避免與其他網站共用。"}
            </p>
            <div className="mt-5">
              <PasswordForm isAdmin={user.role === "admin"} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
