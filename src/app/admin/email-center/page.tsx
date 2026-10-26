import type { Metadata } from "next";
import Link from "next/link";
import { EmailCenter } from "@/components/admin/email-center";

export const metadata: Metadata = { title: "郵件寄送專區" };

export default function AdminEmailCenterPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Manual email</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">郵件寄送專區</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
          管理員可套用郵件範例、調整收件對象與信件內容，先預覽再手動寄出。此頁不會自動寄送，寄出後可到 <Link href="/admin/email-logs" className="text-caramel-deep underline underline-offset-4">郵件紀錄</Link> 查看每位收件者的結果。
        </p>
      </header>
      <EmailCenter />
    </div>
  );
}
