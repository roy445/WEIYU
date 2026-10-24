"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoHorizontal } from "./logo";
import { MemberAvatar } from "./member-avatar";
import { NotificationBell } from "./notification-bell";
import { useStore } from "./store-provider";

type HeaderUser = { name: string; role: "customer" | "admin"; avatarColor: string; avatarUrl: string | null; points: number } | null;

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/products", label: "全部甜點" },
  { href: "/desserts", label: "甜點介紹" },
  { href: "/ordering", label: "訂購須知" },
];

export function SiteHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const { count, openCart, isReady } = useStore();
  const [scrolled, setScrolled] = useState(false);
  // 記錄「在哪個路徑開啟選單」，切換頁面時自然關閉
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const setMenuOpen = (updater: (value: boolean) => boolean) => setMenuPath(updater(menuOpen) ? pathname : null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    const frame = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,height] duration-300 ${
        scrolled
          ? "border-mist/70 bg-cream/92 shadow-[0_10px_30px_-28px_rgba(84,59,43,0.6)] backdrop-blur-md"
          : "border-transparent bg-cream/80 backdrop-blur-sm"
      }`}
    >
      <div className="container-wy">
        <div
          className={`flex items-center justify-between transition-[padding] duration-300 ${
            scrolled ? "py-2" : "py-3.5"
          }`}
        >
          <Link
            href="/"
            aria-label="WEIYU 唯遇甜所 首頁"
            className={`shrink-0 origin-left transition-transform duration-300 ${scrolled ? "scale-[0.86]" : "scale-100"}`}
          >
            <LogoHorizontal />
          </Link>

          <nav aria-label="主要導覽" className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`relative text-[0.82rem] tracking-[0.14em] transition-colors after:absolute after:-bottom-2 after:left-0 after:h-px after:bg-caramel after:transition-all after:duration-300 hover:text-caramel-deep ${
                  isActive(item.href)
                    ? "text-caramel-deep after:w-full"
                    : "text-cocoa after:w-0 hover:after:w-full"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              {user ? (
                <>
                  {user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="rounded-full border border-caramel/40 px-3 py-1.5 text-[0.72rem] tracking-[0.12em] text-caramel-deep transition-colors hover:bg-caramel hover:text-cream"
                    >
                      管理後台
                    </Link>
                  ) : null}
                  <Link
                    href="/account"
                    aria-label={`${user.name}，前往會員中心`}
                    className="flex items-center gap-2 text-[0.8rem] tracking-[0.1em] text-cocoa transition-colors hover:text-caramel-deep"
                  >
                    <MemberAvatar name={user.name} color={user.avatarColor} imageUrl={user.avatarUrl} size="sm" />
                    <span className="max-w-24 truncate">{user.name}</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="text-[0.8rem] tracking-[0.1em] text-cocoa transition-colors hover:text-caramel-deep"
                >
                  會員登入
                </Link>
              )}
            </div>

            {user ? (
              <>
                <Link
                  href="/account/coupons"
                  className="flex items-center gap-1.5 rounded-full border border-caramel/40 px-2.5 py-2 text-xs text-caramel-deep transition-colors hover:bg-oat-soft"
                  aria-label={`目前有 ${user.points} 點甜甜數，前往甜甜數與優惠券中心`}
                >
                  <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
                    <path d="M5 22c0-3 3-5 7-5h9c4 0 6 2 6 5v2H5v-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="m11 17 8-8 7 3-5 6M12 16c-1-3 0-6 3-8l4 1M8 24h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="23" cy="22" r="5" fill="#fbf7f0" stroke="currentColor" strokeWidth="1.6" />
                    <path d="m23 19.5.8 1.7 1.9.2-1.4 1.2.4 1.8-1.7-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2.8-1.7Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                  </svg>
                  <span>{user.points}</span>
                </Link>
                <NotificationBell />
              </>
            ) : null}

            <button
              type="button"
              onClick={openCart}
              className="relative rounded-full border border-mist px-3.5 py-2 text-[0.76rem] tracking-[0.1em] text-cocoa transition-colors hover:border-caramel hover:text-caramel-deep"
              aria-label={`開啟購物袋，目前 ${isReady ? count : 0} 件商品`}
            >
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden sm:inline">購物袋</span>
                <span
                  aria-hidden="true"
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.68rem] transition-colors ${
                    count > 0 ? "bg-caramel text-cream" : "bg-oat text-cocoa"
                  }`}
                >
                  {isReady ? count : 0}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-mist p-2 text-cocoa transition-colors hover:border-caramel lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "關閉導覽選單" : "開啟導覽選單"}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          hidden={!menuOpen}
          className="border-t border-mist/70 pb-4 lg:hidden"
        >
          <nav aria-label="行動版導覽" className="flex flex-col pt-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2 py-2.5 text-sm text-cocoa transition-colors hover:bg-oat-soft hover:text-caramel-deep"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-mist/70 pt-2">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 rounded px-2 py-2.5 text-sm text-cocoa hover:bg-oat-soft"
                  >
                    <MemberAvatar name={user.name} color={user.avatarColor} imageUrl={user.avatarUrl} size="sm" />
                    {user.name} 的帳號
                  </Link>
                  <Link href="/account/announcements" className="block rounded px-2 py-2.5 text-sm text-cocoa hover:bg-oat-soft">公告通知</Link>
                  <Link href="/account/favorites" className="block rounded px-2 py-2.5 text-sm text-cocoa hover:bg-oat-soft">我的收藏</Link>
                  {user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="block rounded px-2 py-2.5 text-sm text-caramel-deep hover:bg-oat-soft"
                    >
                      管理後台
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link href="/login" className="block rounded px-2 py-2.5 text-sm text-cocoa hover:bg-oat-soft">
                    會員登入
                  </Link>
                  <Link
                    href="/register"
                    className="block rounded px-2 py-2.5 text-sm text-cocoa hover:bg-oat-soft"
                  >
                    建立帳號
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
