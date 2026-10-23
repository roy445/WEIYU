"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoLockup } from "./logo";

/**
 * 頁面切換時的品牌過場：點擊站內連結立即以奶油白覆蓋全畫面並顯示 LOGO，
 * 新頁面就緒且至少顯示 MIN_VISIBLE_MS 後淡出。尊重 prefers-reduced-motion（不顯示）。
 */
const MIN_VISIBLE_MS = 620;
const FADE_MS = 420;
const SAFETY_MS = 6000;

type Phase = "hidden" | "visible" | "leaving";

export function PageTransition({ logoUrl }: { logoUrl?: string | null }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("hidden");
  const shownAt = useRef<number | null>(null);
  const lastPathname = useRef<string | null>(null);
  const timers = useRef<number[]>([]);
  const reducedMotion = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    shownAt.current = null;
    setPhase((current) => (current === "hidden" ? current : "leaving"));
    timers.current.push(window.setTimeout(() => setPhase("hidden"), FADE_MS));
  }, [clearTimers]);

  const show = useCallback(() => {
    if (reducedMotion.current) return;
    clearTimers();
    shownAt.current = performance.now();
    setPhase("visible");
    timers.current.push(window.setTimeout(hide, SAFETY_MS));
  }, [clearTimers, hide]);

  // 攔截站內連結點擊：導覽一開始就顯示 LOGO
  useEffect(() => {
    reducedMotion.current =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      if (document.querySelector("[data-splash]")) return;
      show();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, [show, clearTimers]);

  // 路徑變更：確保至少顯示一段時間後淡出；程式化導向（登入後跳轉）也會短暫顯示
  useEffect(() => {
    if (lastPathname.current === null) {
      lastPathname.current = pathname;
      return;
    }
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (reducedMotion.current) return;

    const started = shownAt.current;
    const timer = window.setTimeout(() => {
      if (started === null) {
        show();
        timers.current.push(window.setTimeout(hide, MIN_VISIBLE_MS));
      } else {
        const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - started));
        timers.current.push(window.setTimeout(hide, remaining + 60));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, show, hide]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-cream transition-opacity ease-out ${
        phase === "leaving" ? "opacity-0" : "opacity-100 animate-fade-in-fast"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
      aria-label="頁面載入中"
      data-page-transition={phase}
    >
      <LogoLockup imageUrl={logoUrl} animated />
    </div>
  );
}
