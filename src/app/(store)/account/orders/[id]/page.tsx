import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminActionLogs, orderItems, orders, users } from "@/db/schema";
import { SafeImage } from "@/components/safe-image";
import { PrintButton } from "@/components/print-button";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { OrderHistoryTimeline, type OrderHistoryEvent } from "@/components/order-history-timeline";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatDateTime, formatPrice } from "@/lib/brand";

export const metadata: Metadata = { title: "訂單明細" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string; notification?: string }> };

const timeline = [
  { key: "pending_confirmation", label: "待店家確認" },
  { key: "confirmed", label: "已確認／待面交" },
  { key: "completed", label: "已完成" },
];

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  const { id: rawId } = await params;
  const { placed, notification } = await searchParams;
  if (!user) redirect(`/login?next=/account/orders/${rawId}`);

  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  // 僅允許讀取自己的訂單
  const rows = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, user.id))).limit(1);
  const order = rows[0];
  if (!order) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  const historyActions = ["confirm", "complete", "cancel", "mark_paid", "mark_unpaid", "mark_refunded"] as const;
  const historyRows = await db
    .select({
      action: adminActionLogs.action,
      createdAt: adminActionLogs.createdAt,
      operatorName: users.name,
    })
    .from(adminActionLogs)
    .leftJoin(users, eq(adminActionLogs.adminId, users.id))
    .where(and(
      eq(adminActionLogs.targetType, "order"),
      eq(adminActionLogs.targetId, String(order.id)),
      inArray(adminActionLogs.action, [...historyActions]),
    ))
    .orderBy(asc(adminActionLogs.createdAt));

  const historyLabels: Record<(typeof historyActions)[number], string> = {
    confirm: "店家已接單",
    complete: "訂單已完成",
    cancel: "訂單已取消",
    mark_paid: "已完成付款",
    mark_unpaid: "付款狀態更新為未付款",
    mark_refunded: "已登記退款",
  };
  const history: OrderHistoryEvent[] = [{
    key: "created",
    label: "訂單成立",
    at: order.createdAt,
    actor: "你",
    kind: "member",
  }];

  for (const [index, row] of historyRows.entries()) {
    const action = row.action as (typeof historyActions)[number];
    history.push({
      key: `action-${index}`,
      label: historyLabels[action],
      at: row.createdAt,
      actor: row.operatorName ?? "店家夥伴",
      kind: "store",
    });
  }

  const addOlderMilestone = (action: (typeof historyActions)[number], label: string, at: Date | null) => {
    if (at && !historyRows.some((row) => row.action === action)) {
      history.push({
        key: `older-${action}`,
        label,
        at,
        actor: "店家（舊紀錄未保留姓名）",
        kind: "store",
      });
    }
  };
  addOlderMilestone("confirm", "店家已接單", order.confirmedAt);
  addOlderMilestone("complete", "訂單已完成", order.completedAt);
  addOlderMilestone("mark_paid", "已完成付款", order.paidAt);
  addOlderMilestone("cancel", "訂單已取消", order.cancelledAt);
  history.sort((left, right) => left.at.getTime() - right.at.getTime());

  const currentIndex = timeline.findIndex((step) => step.key === order.status);

  return (
    <div className="container-wy printable-order py-12 md:py-16">
      {placed === "1" ? (
        <section aria-labelledby="order-thanks" className="print-hidden mb-10 overflow-hidden rounded-2xl border border-[#C9D6C6] bg-[#F2F7F0] p-6 text-[#3F5B41] animate-rise sm:p-9">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
                <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="eyebrow mt-5">Thank you for your order</p>
            <h1 id="order-thanks" className="mt-2 font-serif text-3xl sm:text-4xl">謝謝你的訂購！</h1>
            <p className="mt-3 text-sm leading-relaxed">
              訂單 <strong>{order.orderNo}</strong> 已成功送出，目前等待店家確認。確認後會更新訂單狀態，並依你預約的時間面交取貨、當面付款。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href="#order-details" className="btn btn-primary btn-sm">查看訂單明細</a>
              <Link href="/products" className="btn btn-secondary btn-sm">繼續逛甜點</Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed">
              {notification === "sent"
                ? "訂單通知已寄至會員 Email。若收件匣沒有看到，請檢查垃圾郵件；你也可以隨時從會員中心查看訂單進度。"
                : notification === "failed"
                  ? "此次通知信未能寄出，但訂單已成立。你可以隨時從會員中心查看訂單進度，或透過頁尾聯絡方式聯繫店家。"
                  : "你可以隨時從會員中心查看訂單進度。"}
            </p>
          </div>
        </section>
      ) : null}

      <div id="order-details" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <Link href="/account" className="text-xs tracking-[0.1em] text-cocoa-soft hover:text-caramel-deep">
            ← 回會員中心
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl">訂單 {order.orderNo}</h1>
          <p className="mt-2 text-xs text-cocoa-soft">建立於 {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 print-hidden">
          <PrintButton />
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>
      <div className="print-only mt-4 border-b border-mist pb-4 text-sm">
        <p>唯遇甜所｜顧客訂單明細</p>
        <p className="mt-1">訂單日期：{formatDateTime(order.createdAt)} · 訂單狀態：{order.status} · 付款狀態：{order.paymentStatus}</p>
      </div>

      {order.status !== "cancelled" ? (
        <ol className="print-hidden mt-8 grid gap-2 sm:grid-cols-3">
          {timeline.map((step, index) => {
            const reached = index <= currentIndex;
            return (
              <li key={step.key} className="flex items-center gap-3 rounded-lg border border-mist/60 px-4 py-3 text-sm">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${reached ? "bg-caramel text-cream" : "bg-oat text-cocoa-soft"}`}>
                  {index + 1}
                </span>
                <span className={reached ? "text-cocoa" : "text-cocoa-soft"}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 rounded-lg border border-[#D9B8AE] bg-[#FBF1EE] px-5 py-4 text-sm text-[#7C4234]">
          這筆訂單已取消。{order.adminNote ? `店家備註：${order.adminNote}` : ""}
        </p>
      )}

      <OrderHistoryTimeline events={history} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-2xl">
            商品明細
          </h2>
          <ul className="mt-4 divide-y divide-mist/60 border-y border-mist/60">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <div className="print-order-image relative h-16 w-16 shrink-0 overflow-hidden rounded bg-oat-soft">
                  <SafeImage src={item.imageUrl} alt={`${item.productName} 示意圖`} sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-cocoa">{item.productName}</p>
                  <p className="text-xs text-cocoa-soft">
                    {item.variantName ? `規格：${item.variantName} · ` : ""}
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm">{formatPrice(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-cocoa-soft">訂單總金額（下單時價格快照）</p>
            <p className="font-serif text-2xl">{formatPrice(order.total)}</p>
          </div>
          <dl className="mt-3 space-y-1 border-t border-mist/60 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-cocoa-soft">商品小計</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {order.couponDiscount > 0 ? <div className="flex justify-between"><dt className="text-cocoa-soft">優惠券{order.couponTitle ? `（${order.couponTitle}）` : ""}</dt><dd>−{formatPrice(order.couponDiscount)}</dd></div> : null}
            {order.pointsUsed > 0 ? <div className="flex justify-between"><dt className="text-cocoa-soft">甜甜數折抵（{order.pointsUsed} 點）</dt><dd>−{formatPrice(order.pointsUsed)}</dd></div> : null}
            {order.status === "completed" && order.pointsEarned > 0 ? <div className="flex justify-between"><dt className="text-cocoa-soft">本筆回饋甜甜數</dt><dd>{order.pointsEarned} 點</dd></div> : null}
          </dl>
          {order.customerNote ? (
            <div className="mt-6 rounded-lg bg-cream-deep/70 px-5 py-4 text-sm">
              <p className="text-xs tracking-[0.18em] text-caramel-deep">你的備註</p>
              <p className="mt-1 leading-relaxed text-cocoa">{order.customerNote}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="surface rounded-lg p-5">
            <p className="eyebrow">Pickup</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-cocoa-soft">取貨方式</dt><dd>面交取貨</dd></div>
              <div><dt className="text-xs text-cocoa-soft">面交地點</dt><dd>{order.pickupLocationName}</dd></div>
              <div><dt className="text-xs text-cocoa-soft">面交日期與時段</dt><dd>{formatDate(order.pickupDate)} {order.pickupTime}</dd></div>
              {order.pickupLocationNotes ? <div><dt className="text-xs text-cocoa-soft">注意事項</dt><dd className="leading-relaxed">{order.pickupLocationNotes}</dd></div> : null}
            </dl>
          </div>
          <div className="surface rounded-lg p-5">
            <p className="eyebrow">Payment</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-cocoa-soft">付款方式</dt><dd>取貨時付款</dd></div>
              <div><dt className="text-xs text-cocoa-soft">付款狀態</dt><dd><PaymentStatusBadge status={order.paymentStatus} /></dd></div>
              {order.paidAt ? <div><dt className="text-xs text-cocoa-soft">付款時間</dt><dd>{formatDateTime(order.paidAt)}</dd></div> : null}
            </dl>
          </div>
          <div className="surface rounded-lg p-5">
            <p className="eyebrow">Contact</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-cocoa-soft">取貨人</dt><dd>{order.contactName}</dd></div>
              <div><dt className="text-xs text-cocoa-soft">電話</dt><dd>{order.contactPhone}</dd></div>
              <div><dt className="text-xs text-cocoa-soft">電子郵件</dt><dd>{order.contactEmail}</dd></div>
            </dl>
          </div>
          <p className="print-hidden text-xs leading-relaxed text-cocoa-soft">如需修改或取消訂單，請透過頁尾聯絡方式直接與我聯繫。</p>
        </aside>
      </div>
    </div>
  );
}
