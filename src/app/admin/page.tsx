import Link from "next/link";
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminActionLogs, orders, products } from "@/db/schema";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { formatDateTime, formatPrice } from "@/lib/brand";
import { getShopSettings } from "@/lib/settings";
import { hasActivePickupOptions } from "@/lib/orders";

async function count(condition?: ReturnType<typeof eq>) {
  const query = db.select({ value: sql<number>`count(*)::int` }).from(products);
  const rows = condition ? await query.where(condition) : await query;
  return Number(rows[0]?.value ?? 0);
}

export default async function AdminDashboard() {
  const [settings, pickupReady] = await Promise.all([getShopSettings(), hasActivePickupOptions()]);

  const [totalProducts, activeProducts, outOfStock] = await Promise.all([
    count(),
    count(eq(products.isActive, true)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.isActive, true), lte(products.stock, 0)))
      .then((rows) => Number(rows[0]?.value ?? 0)),
  ]);

  const orderStats = await db
    .select({ status: orders.status, value: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.total}),0)::int` })
    .from(orders)
    .groupBy(orders.status);
  const byStatus = new Map(orderStats.map((row) => [row.status, { count: Number(row.value), total: Number(row.total) }]));

  const paid = await db
    .select({ value: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.total}),0)::int` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, "paid"), ne(orders.status, "cancelled")));
  const unpaidActive = await db
    .select({ value: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.total}),0)::int` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, "unpaid"), ne(orders.status, "cancelled")));

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8);
  const recentLogs = await db.select().from(adminActionLogs).orderBy(desc(adminActionLogs.createdAt)).limit(8);

  const cards = [
    { label: "商品總數", value: totalProducts, href: "/admin/products" },
    { label: "上架商品", value: activeProducts, href: "/admin/products" },
    { label: "缺貨商品", value: outOfStock, href: "/admin/products?filter=out" },
    { label: "待確認訂單", value: byStatus.get("pending_confirmation")?.count ?? 0, href: "/admin/orders?status=pending_confirmation" },
    { label: "待面交訂單", value: byStatus.get("confirmed")?.count ?? 0, href: "/admin/orders?status=confirmed" },
    { label: "已完成訂單", value: byStatus.get("completed")?.count ?? 0, href: "/admin/orders?status=completed" },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-3 text-3xl">後台總覽</h1>
          <p className="mt-2 text-sm text-cocoa-soft">所有數字皆來自目前資料庫的即時統計。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`badge ${settings.isAcceptingOrders ? "bg-[#E4EDE4] text-[#3F5B41]" : "bg-[#EFE4E1] text-[#8A4B3D]"}`}>
            {settings.isAcceptingOrders ? "開放接單中" : "已暫停接單"}
          </span>
          <span className={`badge ${pickupReady ? "bg-[#E4EDE4] text-[#3F5B41]" : "bg-[#F3ECE1] text-[#8A6A43]"}`}>
            {pickupReady ? "已有可預約面交時段" : "尚無可預約面交時段"}
          </span>
        </div>
      </div>

      <section aria-labelledby="quick-start" className="surface rounded-lg p-5 sm:p-6">
        <p className="eyebrow">Quick start</p>
        <h2 id="quick-start" className="mt-2 text-2xl">第一次使用？照這四步設定</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "整理商品", text: "新增商品、照片、價格與庫存。", href: "/admin/products", done: totalProducts > 0, action: "前往商品" },
            { title: "安排面交", text: "設定實際取貨地點與可預約時段。", href: "/admin/pickup", done: pickupReady, action: "設定時段" },
            { title: "填寫商店資訊", text: "更新聯絡方式、條款、FAQ 與注意事項。", href: "/admin/settings", done: Boolean(settings.contactEmail || settings.contactPhone), action: "編輯內容" },
            { title: "開始接單", text: "確認商品與面交安排後開放接單。", href: "/admin/orders", done: settings.isAcceptingOrders, action: "查看訂單" },
          ].map((step, index) => (
            <li key={step.title} className="rounded-lg border border-mist/70 bg-cream/60 p-4">
              <p className="text-xs text-cocoa-soft">步驟 {index + 1} · {step.done ? "已完成" : "待完成"}</p>
              <h3 className="mt-2 font-medium text-cocoa">{step.title}</h3>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-cocoa-soft">{step.text}</p>
              <Link href={step.href} className="mt-3 inline-block text-xs font-medium text-caramel-deep underline underline-offset-4">{step.action} →</Link>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-mist/70 pt-4 text-xs">
          <Link href="/admin/analytics" className="text-caramel-deep underline underline-offset-4">查看商品成效</Link>
          <Link href="/admin/members" className="text-caramel-deep underline underline-offset-4">搜尋會員帳號</Link>
          <Link href="/faq" target="_blank" className="text-caramel-deep underline underline-offset-4">預覽顧客常見問題</Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <Link
            key={card.label}
            href={card.href}
            className="surface rounded-lg px-5 py-5 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-caramel/50 animate-rise"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <p className="text-xs tracking-[0.18em] text-cocoa-soft">{card.label}</p>
            <p className="mt-2 font-serif text-4xl text-cocoa">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-cocoa px-5 py-5 text-cream">
          <p className="text-xs tracking-[0.18em] text-oat">已收款（非取消訂單）</p>
          <p className="mt-2 font-serif text-3xl">{formatPrice(Number(paid[0]?.total ?? 0))}</p>
          <p className="mt-1 text-xs text-oat">{Number(paid[0]?.value ?? 0)} 筆</p>
        </div>
        <div className="surface rounded-lg px-5 py-5">
          <p className="text-xs tracking-[0.18em] text-cocoa-soft">待收款（進行中訂單）</p>
          <p className="mt-2 font-serif text-3xl">{formatPrice(Number(unpaidActive[0]?.total ?? 0))}</p>
          <p className="mt-1 text-xs text-cocoa-soft">{Number(unpaidActive[0]?.value ?? 0)} 筆</p>
        </div>
        <div className="surface rounded-lg px-5 py-5">
          <p className="text-xs tracking-[0.18em] text-cocoa-soft">已取消訂單</p>
          <p className="mt-2 font-serif text-3xl">{byStatus.get("cancelled")?.count ?? 0}</p>
          <p className="mt-1 text-xs text-cocoa-soft">庫存已依規則恢復</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="recent-orders">
          <div className="flex items-center justify-between">
            <h2 id="recent-orders" className="text-xl">近期訂單</h2>
            <Link href="/admin/orders" className="text-xs tracking-[0.12em] text-caramel-deep hover:underline">查看全部</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="surface mt-3 rounded-lg px-5 py-8 text-center text-sm text-cocoa-soft">目前還沒有訂單。</p>
          ) : (
            <ul className="mt-3 divide-y divide-mist/60 rounded-lg border border-mist/60 bg-[#fffdf8]">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-oat-soft/50 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-cocoa">{order.orderNo} · {order.contactName}</p>
                      <p className="text-xs text-cocoa-soft">{formatDateTime(order.createdAt)} · 面交 {order.pickupDate} {order.pickupTime}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <span className="text-sm">{formatPrice(order.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-logs">
          <h2 id="recent-logs" className="text-xl">近期操作紀錄</h2>
          {recentLogs.length === 0 ? (
            <p className="surface mt-3 rounded-lg px-5 py-8 text-center text-sm text-cocoa-soft">尚無操作紀錄。</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentLogs.map((log) => (
                <li key={log.id} className="surface rounded-lg px-4 py-3 text-xs">
                  <p className="text-cocoa">
                    <span className="font-medium">{log.action}</span>
                    {log.detail ? <span className="text-cocoa-soft"> · {log.detail}</span> : null}
                  </p>
                  <p className="mt-1 text-cocoa-soft">{log.adminEmail} · {formatDateTime(log.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
