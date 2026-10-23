import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { SafeImage } from "@/components/safe-image";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatDateTime, formatPrice } from "@/lib/brand";

export const metadata: Metadata = { title: "訂單明細" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> };

const timeline = [
  { key: "pending_confirmation", label: "待店家確認" },
  { key: "confirmed", label: "已確認／待面交" },
  { key: "completed", label: "已完成" },
];

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  const { id: rawId } = await params;
  const { placed } = await searchParams;
  if (!user) redirect(`/login?next=/account/orders/${rawId}`);

  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  // 僅允許讀取自己的訂單
  const rows = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, user.id))).limit(1);
  const order = rows[0];
  if (!order) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  const currentIndex = timeline.findIndex((step) => step.key === order.status);

  return (
    <div className="container-wy py-12 md:py-16">
      {placed === "1" ? (
        <div className="mb-8 rounded-lg border border-[#C9D6C6] bg-[#F2F7F0] px-6 py-5 text-sm text-[#3F5B41] animate-rise">
          <p className="font-serif text-xl">訂單已送出，謝謝你。</p>
          <p className="mt-1">目前狀態為「待店家確認」。我確認後會更新狀態，並於約定時段面交取貨、當面付款。</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <Link href="/account" className="text-xs tracking-[0.1em] text-cocoa-soft hover:text-caramel-deep">
            ← 回會員中心
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl">訂單 {order.orderNo}</h1>
          <p className="mt-2 text-xs text-cocoa-soft">建立於 {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {order.status !== "cancelled" ? (
        <ol className="mt-8 grid gap-2 sm:grid-cols-3">
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

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-2xl">
            商品明細
          </h2>
          <ul className="mt-4 divide-y divide-mist/60 border-y border-mist/60">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-oat-soft">
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
          <p className="text-xs leading-relaxed text-cocoa-soft">如需修改或取消訂單，請透過頁尾聯絡方式直接與我聯繫。</p>
        </aside>
      </div>
    </div>
  );
}
