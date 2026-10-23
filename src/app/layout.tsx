import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: `${BRAND.nameEn}｜${BRAND.nameZh} — ${BRAND.tagline}`,
    template: `%s｜${BRAND.nameEn} ${BRAND.nameZh}`,
  },
  description: BRAND.description,
  applicationName: `${BRAND.nameEn} ${BRAND.nameZh}`,
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: `${BRAND.nameEn}｜${BRAND.nameZh}`,
    title: `${BRAND.nameEn}｜${BRAND.nameZh} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: [{ url: "/images/hero.jpg", width: 1200, height: 800, alt: "WEIYU 唯遇甜所 甜點示意圖" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FBF7F0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 品牌字體：透過 App Router 根 layout 載入即為全站生效；失敗時由 CSS fallback 字體接手 */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-cocoa antialiased">{children}</body>
    </html>
  );
}
