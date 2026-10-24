"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account/announcements?summary=1", { cache: "no-store" });
      const data = (await response.json()) as { ok?: boolean; unreadCount?: number };
      if (!response.ok || !data.ok) throw new Error("Notification summary unavailable");
      setUnreadCount(data.unreadCount ?? 0);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("weiyu:notifications-updated", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("weiyu:notifications-updated", refresh);
    };
  }, [refresh]);

  return (
    <Link
      href="/account/announcements"
      className={`relative inline-flex items-center gap-2 rounded-full border border-mist text-cocoa transition-colors hover:border-caramel hover:text-caramel-deep ${
        compact ? "w-fit px-3 py-2 text-sm" : "p-2"
      }`}
      aria-label={loadFailed ? "公告通知載入失敗" : `公告通知${unreadCount > 0 ? `，${unreadCount} 則未讀` : ""}`}
      title={loadFailed ? "公告通知載入失敗" : "公告通知"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? <span>公告通知</span> : null}
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-caramel px-1 text-[0.65rem] text-cream">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
