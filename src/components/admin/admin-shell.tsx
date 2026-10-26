"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { LogoutButton } from "@/components/auth-forms";

const links = [
  { href: "/admin", label: "總覽", icon: "◫" },
  { href: "/admin/orders", label: "訂單", icon: "☰" },
  { href: "/admin/coupons", label: "優惠券", icon: "◇" },
  { href: "/admin/announcements", label: "公告", icon: "♧" },
  { href: "/admin/email-logs", label: "郵件紀錄", icon: "✉" },
  { href: "/admin/products", label: "商品", icon: "✿" },
  { href: "/admin/costs", label: "成本與定價", icon: "$" },
  { href: "/admin/analytics", label: "商品成效", icon: "↗" },
  { href: "/admin/members", label: "會員帳號", icon: "◎" },
  { href: "/admin/pickup", label: "面交時段", icon: "◷" },
  { href: "/admin/customize", label: "客製化中心", icon: "✧" },
  { href: "/admin/settings", label: "商店設定", icon: "⚙" },
];

export function AdminShell({ children, adminName }: { children: ReactNode; adminName: string }) {
  const pathname = usePathname();
  // 記錄「在哪個路徑開啟選單」，切換頁面時自然關閉，不需要 effect
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (updater: (value: boolean) => boolean) => setOpenPath(updater(open) ? pathname : null);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="後台導覽" className="flex flex-col gap-1">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="admin-link" data-active={isActive(link.href)}>
          <span aria-hidden="true" className="w-4 text-center text-xs opacity-70">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="hidden w-64 shrink-0 flex-col bg-cocoa px-5 py-7 text-cream lg:flex">
        <Link href="/admin" className="flex items-center gap-3 text-oat">
          <LogoMark className="h-10 w-8" strokeWidth={2} />
          <span className="leading-none">
            <span className="block font-serif text-lg tracking-[0.3em] text-cream">WEIYU</span>
            <span className="mt-1 block text-[0.62rem] tracking-[0.3em] text-oat">管理後台</span>
          </span>
        </Link>
        <div className="mt-8">{nav}</div>
        <div className="mt-auto space-y-3 border-t border-oat/20 pt-5 text-xs text-oat">
          <p>登入身分：{adminName}</p>
          <Link href="/account" className="block hover:text-cream">帳號資料與變更密碼</Link>
          <Link href="/" className="block hover:text-cream">← 回到前台</Link>
          <LogoutButton className="rounded-full border border-oat/40 px-3 py-1.5 text-xs text-oat transition-colors hover:border-cream hover:text-cream" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-mist/70 bg-cream/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Link href="/admin" className="flex items-center gap-2 text-caramel">
            <LogoMark className="h-8 w-6" strokeWidth={2} />
            <span className="font-serif text-base tracking-[0.3em] text-cocoa">WEIYU 後台</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-mist px-3 py-1.5 text-xs text-cocoa"
            aria-expanded={open}
            aria-controls="admin-mobile-nav"
          >
            {open ? "關閉選單" : "選單"}
          </button>
        </header>
        <div
          id="admin-mobile-nav"
          hidden={!open}
          className="border-b border-mist/70 bg-cocoa px-4 py-4 text-cream lg:hidden animate-fade-in"
        >
          {nav}
          <div className="mt-4 flex items-center justify-between border-t border-oat/20 pt-3 text-xs text-oat">
            <Link href="/">← 回到前台</Link>
            <LogoutButton className="rounded-full border border-oat/40 px-3 py-1 text-xs text-oat" />
          </div>
        </div>

        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
