"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 只記錄摘要，不輸出堆疊或敏感資訊到畫面
    console.error("Page error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-6">
      <div className="surface max-w-md rounded-xl px-8 py-10 text-center animate-rise">
        <p className="eyebrow">Error</p>
        <h1 className="mt-3 text-3xl">發生了一點問題</h1>
        <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">
          頁面暫時無法載入，可能是資料庫連線或伺服器發生錯誤。請稍後再試；若持續發生，請聯繫店家。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary btn-sm">重新載入</button>
          <Link href="/" className="btn btn-secondary btn-sm">回到首頁</Link>
        </div>
      </div>
    </div>
  );
}
