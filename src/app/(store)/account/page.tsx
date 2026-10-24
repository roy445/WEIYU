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
import { getCurrentUser } from "@/lib/auth";
import { getPointsBalance } from "@/lib/rewards";
import { formatDate, formatDateTime, formatPrice } from "@/lib/brand";

export const metadata: Metadata = { title: "會員中心" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  let myOrders: (typeof orders.$inferSelect)[] = [];
  let loadError = false;
  let pointsBalance = 0;
  try {
    [myOrders, pointsBalance] = await Promise.all([
      db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)),
      getPointsBalance(user.id),
    ]);
  } catch {
    loadError = true;
  }

  return (
    <div className="container-wy py-12 md:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <p className="eyebrow">Member</p>
          <h1 className="mt-4 text-4xl">會員中心</h1>
          <p className="mt-2 text-sm text-cocoa-soft">你好，{user.name}。這裡可以查看訂單進度與更新聯絡資料。</p>
        </div>
        <div className="flex gap-3">
          <Link href="/account/favorites" className="btn btn-secondary btn-sm">我的收藏</Link>
          <Link href="/account/coupons" className="btn btn-secondary btn-sm">甜甜數 {pointsBalance} · 優惠券</Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="btn btn-dark btn-sm">
              前往管理後台
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="text-2xl">
            我的訂單
          </h2>
          {loadError ? (
            <p className="mt-4 rounded-lg border border-[#D9B8AE] bg-[#FBF1EE] px-5 py-4 text-sm text-[#7C4234]">
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
