import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { ORDER_STATUS, formatDateTime, formatPrice, isOrderStatus } from "@/lib/brand";

export const metadata: Metadata = { title: "訂單管理" };

type SearchParams = Promise<{ status?: string; q?: string; from?: string; to?: string; payment?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status && isOrderStatus(params.status) ? params.status : undefined;
  const payment = params.payment === "paid" || params.payment === "unpaid" ? params.payment : undefined;
  const q = params.q?.trim().slice(0, 60);
  const from = params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : undefined;
  const to = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : undefined;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(orders.status, status));
  if (payment) conditions.push(eq(orders.paymentStatus, payment));
  if (q) {
    const pattern = `%${q}%`;
    const search = or(ilike(orders.orderNo, pattern), ilike(orders.contactName, pattern), ilike(orders.contactPhone, pattern), ilike(orders.contactEmail, pattern));
    if (search) conditions.push(search);
  }
  if (from) conditions.push(gte(orders.createdAt, new Date(`${from}T00:00:00+08:00`)));
  if (to) conditions.push(lte(orders.createdAt, new Date(`${to}T23:59:59+08:00`)));

  const base = db.select().from(orders);
  const rows = conditions.length ? await base.where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(200) : await base.orderBy(desc(orders.createdAt)).limit(200);

  const statusLink = (value?: string) => {
    const next = new URLSearchParams();
    if (value) next.set("status", value);
    if (q) next.set("q", q);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (payment) next.set("payment", payment);
    const text = next.toString();
    return text ? `/admin/orders?${text}` : "/admin/orders";
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Orders</p>
        <h1 className="mt-3 text-3xl">訂單管理</h1>
        <p className="mt-2 text-sm text-cocoa-soft">依狀態、編號、聯絡資訊或日期篩選。點擊訂單可確認、完成、取消或更新付款狀態。</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link href={statusLink()} className={`rounded-full border px-3 py-1.5 ${!status ? "border-caramel bg-caramel text-cream" : "border-mist text-cocoa hover:border-caramel"}`}>全部</Link>
        {(Object.keys(ORDER_STATUS) as (keyof typeof ORDER_STATUS)[]).map((key) => (
          <Link key={key} href={statusLink(key)} className={`rounded-full border px-3 py-1.5 ${status === key ? "border-caramel bg-caramel text-cream" : "border-mist text-cocoa hover:border-caramel"}`}>
            {ORDER_STATUS[key]}
          </Link>
        ))}
      </div>

      <form className="surface grid gap-3 rounded-lg p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]" method="get">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input name="q" defaultValue={q ?? ""} placeholder="訂單編號、姓名、電話或 Email" className="field" aria-label="搜尋訂單" />
        <label className="flex items-center gap-2 text-xs text-cocoa-soft">
          從
          <input type="date" name="from" defaultValue={from ?? ""} className="field min-h-10 py-1" aria-label="起始日期" />
        </label>
        <label className="flex items-center gap-2 text-xs text-cocoa-soft">
          到
          <input type="date" name="to" defaultValue={to ?? ""} className="field min-h-10 py-1" aria-label="結束日期" />
        </label>
        <select name="payment" defaultValue={payment ?? ""} className="field min-h-10 py-1" aria-label="付款狀態">
          <option value="">所有付款狀態</option>
          <option value="unpaid">尚未付款</option>
          <option value="paid">已付款</option>
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm">搜尋</button>
          <Link href="/admin/orders" className="btn btn-secondary btn-sm">清除</Link>
        </div>
      </form>

      <p className="text-xs text-cocoa-soft">共 {rows.length} 筆（最多顯示 200 筆）</p>

      {rows.length === 0 ? (
        <p className="surface rounded-lg px-5 py-10 text-center text-sm text-cocoa-soft">沒有符合條件的訂單。</p>
      ) : (
        <>
          {/* 桌面表格 */}
          <div className="hidden overflow-hidden rounded-lg border border-mist/60 bg-[#fffdf8] md:block">
            <table className="w-full text-sm">
              <thead className="bg-oat-soft/60 text-left text-xs tracking-[0.12em] text-cocoa-soft">
                <tr>
                  <th className="px-4 py-3 font-normal">訂單</th>
                  <th className="px-4 py-3 font-normal">取貨人</th>
                  <th className="px-4 py-3 font-normal">面交</th>
                  <th className="px-4 py-3 font-normal">金額</th>
                  <th className="px-4 py-3 font-normal">狀態</th>
                  <th className="px-4 py-3 font-normal">付款</th>
                  <th className="px-4 py-3 font-normal"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/60">
                {rows.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-oat-soft/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-cocoa">{order.orderNo}</p>
                      <p className="text-xs text-cocoa-soft">{formatDateTime(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{order.contactName}</p>
                      <p className="text-xs text-cocoa-soft">{order.contactPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p>{order.pickupLocationName}</p>
                      <p className="text-cocoa-soft">{order.pickupDate} {order.pickupTime}</p>
                    </td>
                    <td className="px-4 py-3">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={order.paymentStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="btn btn-secondary btn-sm">處理</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 手機卡片 */}
          <ul className="grid gap-3 md:hidden">
            {rows.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="surface block rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{order.orderNo}</p>
                    <p className="text-sm">{formatPrice(order.total)}</p>
                  </div>
                  <p className="mt-1 text-xs text-cocoa-soft">{order.contactName} · {order.contactPhone}</p>
                  <p className="text-xs text-cocoa-soft">{order.pickupLocationName} · {order.pickupDate} {order.pickupTime}</p>
                  <div className="mt-2 flex gap-2">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
