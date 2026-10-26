import { formatDateTime } from "@/lib/brand";

export type OrderHistoryEvent = {
  key: string;
  label: string;
  at: Date;
  actor: string;
  kind: "member" | "store";
};

export function OrderHistoryTimeline({ events }: { events: OrderHistoryEvent[] }) {
  return (
    <section aria-labelledby="order-history-heading" className="surface mt-6 rounded-lg p-5 sm:p-6">
      <div>
        <p className="eyebrow">Order history</p>
        <h2 id="order-history-heading" className="mt-2 text-xl">訂單處理時間軸</h2>
        <p className="mt-1 text-xs leading-relaxed text-cocoa-soft">記錄下單、店家接單、完成與付款等重要進度。</p>
      </div>

      <ol className="mt-5">
        {events.map((event, index) => (
          <li key={event.key} className="relative flex gap-4 pb-5 last:pb-0">
            {index < events.length - 1 ? <span aria-hidden="true" className="absolute left-[0.45rem] top-3 h-full w-px bg-mist" /> : null}
            <span
              aria-hidden="true"
              className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${event.kind === "member" ? "border-caramel bg-cream" : "border-caramel-deep bg-caramel"}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <p className="font-medium text-cocoa">{event.label}</p>
                <time className="text-xs text-cocoa-soft" dateTime={event.at.toISOString()}>{formatDateTime(event.at)}</time>
              </div>
              <p className="mt-1 text-xs text-cocoa-soft">{event.kind === "member" ? "操作人" : "處理人"}：{event.actor}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
