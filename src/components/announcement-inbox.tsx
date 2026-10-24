"use client";

import { useState } from "react";

export type InboxAnnouncement = {
  id: number;
  title: string;
  body: string;
  type: string;
  publishedAt: Date | string;
  readAt: Date | string | null;
};

const labels: Record<string, string> = {
  info: "一般公告",
  important: "重要通知",
  promotion: "新品／活動",
};

export function AnnouncementInbox({ announcements }: { announcements: InboxAnnouncement[] }) {
  const [items, setItems] = useState(announcements);
  const [pending, setPending] = useState<number | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = items.filter((item) => !item.readAt).length;

  const markRead = async (id?: number) => {
    const key = id ?? "all";
    setPending(key);
    setError(null);
    try {
      const response = await fetch("/api/account/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { announcementId: id } : { readAll: true }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "無法更新公告狀態。");
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => (!id || item.id === id) ? { ...item, readAt } : item));
      window.dispatchEvent(new Event("weiyu:notifications-updated"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "更新失敗，請稍後再試。");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-lg bg-[#EFE4E1] px-4 py-3 text-sm text-[#8A4B3D]">{error}</p> : null}
      {unreadCount > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-cocoa-soft">{unreadCount} 則未讀公告</p>
          <button type="button" className="text-sm text-caramel-deep underline underline-offset-4 disabled:opacity-50" disabled={pending !== null} onClick={() => void markRead()}>
            全部標示為已讀
          </button>
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className="surface rounded-xl px-5 py-10 text-center text-sm text-cocoa-soft">目前沒有公告通知。</p>
      ) : items.map((item) => (
        <article key={item.id} className={`surface rounded-xl p-5 ${item.readAt ? "opacity-80" : "border-caramel/40"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="badge bg-oat-soft text-cocoa">{labels[item.type] ?? labels.info}</span>
              {!item.readAt ? <span className="ml-2 text-xs font-medium text-caramel-deep">未讀</span> : null}
              <h2 className="mt-2 text-lg">{item.title}</h2>
            </div>
            <time className="text-xs text-cocoa-soft">{new Date(item.publishedAt).toLocaleString("zh-TW")}</time>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-cocoa-soft">{item.body}</p>
          {!item.readAt ? (
            <button type="button" className="mt-4 text-sm text-caramel-deep underline underline-offset-4 disabled:opacity-50" disabled={pending !== null} onClick={() => void markRead(item.id)}>
              {pending === item.id ? "更新中…" : "標示為已讀"}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
