import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { emailDeliveryLogs } from "@/db/schema";
import { formatDateTime } from "@/lib/brand";

export const metadata: Metadata = { title: "郵件寄送紀錄" };

const statusLabels: Record<string, string> = {
  sent: "已寄出",
  failed: "寄送失敗",
  pending: "處理中／結果待更新",
};

export default async function AdminEmailLogsPage() {
  const logs = await db.select().from(emailDeliveryLogs).orderBy(desc(emailDeliveryLogs.createdAt)).limit(200);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Outgoing mail</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">郵件寄送紀錄</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
          顯示最近 200 筆系統郵件的收件者、主旨、寄送原因、嘗試時間、成功時間與失敗原因。新紀錄會從此功能上線後開始累積。
        </p>
      </header>

      {logs.length === 0 ? (
        <p className="surface rounded-xl px-5 py-8 text-sm text-cocoa-soft">尚無郵件寄送紀錄。</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="surface rounded-xl p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`badge ${log.status === "sent" ? "bg-oat-soft text-cocoa" : log.status === "failed" ? "bg-[#FFF5F3] text-[#8A4B3D]" : "bg-cream-deep text-cocoa"}`}>
                    {statusLabels[log.status] ?? log.status}
                  </span>
                  <h2 className="mt-2 break-words font-medium text-cocoa">{log.subject}</h2>
                  <p className="mt-1 break-all text-sm text-cocoa-soft">收件者：{log.recipientEmail}</p>
                </div>
                <p className="text-xs text-cocoa-soft">紀錄 #{log.id}</p>
              </div>
              <dl className="mt-4 grid gap-2 border-t border-mist/70 pt-3 text-sm sm:grid-cols-2">
                <div><dt className="inline text-cocoa-soft">寄送原因：</dt><dd className="inline">{log.reason}</dd></div>
                <div><dt className="inline text-cocoa-soft">嘗試時間：</dt><dd className="inline">{formatDateTime(log.attemptedAt)}</dd></div>
                <div><dt className="inline text-cocoa-soft">成功寄出時間：</dt><dd className="inline">{formatDateTime(log.sentAt)}</dd></div>
                <div><dt className="inline text-cocoa-soft">建立紀錄時間：</dt><dd className="inline">{formatDateTime(log.createdAt)}</dd></div>
              </dl>
              {log.error ? <p className="mt-3 rounded-lg border border-[#D9A39A]/60 bg-[#FFF5F3] p-3 text-sm leading-relaxed text-[#8A4B3D]">失敗原因：{log.error}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
