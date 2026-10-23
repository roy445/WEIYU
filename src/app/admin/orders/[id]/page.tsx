import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminActionLogs, orderItems, orders, users } from "@/db/schema";
import { OrderActions } from "@/components/admin/order-actions";
import { SafeImage } from "@/components/safe-image";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime, formatPrice } from "@/lib/brand";

export const metadata: Metadata = { title: "訂單詳情" };

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  const rows = await db
    .select({ order: orders, memberName: users.name, memberEmail: users.email })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();
  const order = row.order;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const logs = await db
    .select()
    .from(adminActionLogs)
    .where(eq(adminActionLogs.targetId, String(order.id)))
    .orderBy(desc(adminActionLogs.createdAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs tracking-[0.1em] text-cocoa-soft hover:text-caramel-deep">← 回訂單列表</Link>
          <h1 className="mt-3 text-3xl">訂單 {order.orderNo}</h1>
          <p className="mt-1 text-xs text-cocoa-soft">建立於 {formatDateTime(order.createdAt)} · 最後更新 {formatDateTime(order.updatedAt)}</p>
        </div>
        <div className="flex gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="surface rounded-lg p-5">
            <h2 className="text-xl">商品明細</h2>
            <ul className="mt-3 divide-y divide-mist/60">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-oat-soft">
                    <SafeImage src={item.imageUrl} alt={item.productName} sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-cocoa-soft">{item.variantName ? `規格：${item.variantName} · ` : ""}{formatPrice(item.unitPrice)} × {item.quantity}</p>
                  </div>
                  <p className="text-sm">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-mist/60 pt-3">
              <p className="text-sm text-cocoa-soft">訂單總金額（下單時快照）</p>
              <p className="font-serif text-2xl">{formatPrice(order.total)}</p>
            </div>
            {order.customerNote ? (
              <div className="mt-4 rounded bg-cream-deep/80 px-4 py-3 text-sm">
                <p className="text-xs tracking-[0.18em] text-caramel-deep">顧客備註</p>
                <p className="mt-1 leading-relaxed">{order.customerNote}</p>
              </div>
            ) : null}
          </section>

          <section className="surface rounded-lg p-5">
            <h2 className="text-xl">處理訂單</h2>
            <div className="mt-4">
              <OrderActions orderId={order.id} status={order.status} paymentStatus={order.paymentStatus} adminNote={order.adminNote} />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface rounded-lg p-5 text-sm">
            <p className="eyebrow">Pickup</p>
            <dl className="mt-3 space-y-2">
              <div><dt className="text-xs text-cocoa-soft">面交地點</dt><dd>{order.pickupLocationName}</dd></div>
              <div><dt className="text-xs text-cocoa-soft">日期與時段</dt><dd>{formatDate(order.pickupDate)} {order.pickupTime}</dd></div>
              <div><dt className="text-xs text-cocoa-soft">付款方式</dt><dd>取貨時付款</dd></div>
              {order.paidAt ? <div><dt className="text-xs text-cocoa-soft">付款時間</dt><dd>{formatDateTime(order.paidAt)}</dd></div> : null}
              {order.confirmedAt ? <div><dt className="text-xs text-cocoa-soft">確認時間</dt><dd>{formatDateTime(order.confirmedAt)}</dd></div> : null}
              {order.completedAt ? <div><dt className="text-xs text-cocoa-soft">完成時間</dt><dd>{formatDateTime(order.completedAt)}</dd></div> : null}
              {order.cancelledAt ? <div><dt className="text-xs text-cocoa-soft">取消時間</dt><dd>{formatDateTime(order.cancelledAt)}</dd></div> : null}
            </dl>
          </div>
          <div className="surface rounded-lg p-5 text-sm">
            <p className="eyebrow">Customer</p>
            <dl className="mt-3 space-y-2">
              <div><dt className="text-xs text-cocoa-soft">取貨人</dt><dd>{order.contactName}</dd></div>
              <div><dt className="text-xs text-cocoa-soft">電話</dt><dd><a href={`tel:${order.contactPhone}`} className="underline decoration-mist underline-offset-4">{order.contactPhone}</a></dd></div>
              <div><dt className="text-xs text-cocoa-soft">Email</dt><dd><a href={`mailto:${order.contactEmail}`} className="underline decoration-mist underline-offset-4">{order.contactEmail}</a></dd></div>
              <div><dt className="text-xs text-cocoa-soft">會員帳號</dt><dd>{row.memberName ?? "—"}（{row.memberEmail ?? "—"}）</dd></div>
            </dl>
          </div>
          <div className="surface rounded-lg p-5 text-sm">
            <p className="eyebrow">History</p>
            {logs.length === 0 ? (
              <p className="mt-3 text-xs text-cocoa-soft">尚無操作紀錄。</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {logs.map((log) => (
                  <li key={log.id} className="border-l border-mist pl-3">
                    <p className="text-cocoa">{log.action}{log.detail ? ` · ${log.detail}` : ""}</p>
                    <p className="text-cocoa-soft">{log.adminEmail} · {formatDateTime(log.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
