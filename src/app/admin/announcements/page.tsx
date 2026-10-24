import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { db } from "@/db";
import { announcementNotifications, announcements } from "@/db/schema";

export const metadata: Metadata = { title: "公告管理" };

export default async function AdminAnnouncementsPage() {
  const items = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      type: announcements.type,
      displayMode: announcements.displayMode,
      sendEmail: announcements.sendEmail,
      publishedAt: announcements.publishedAt,
      recipientCount: sql<number>`count(${announcementNotifications.userId})::int`,
      emailSent: sql<number>`count(${announcementNotifications.emailSentAt})::int`,
      emailFailed: sql<number>`count(*) filter (where ${announcementNotifications.emailError} is not null)::int`,
    })
    .from(announcements)
    .leftJoin(announcementNotifications, eq(announcementNotifications.announcementId, announcements.id))
    .groupBy(announcements.id)
    .orderBy(desc(announcements.publishedAt))
    .limit(30);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Member updates</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">公告管理</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
          發布後會員可從網站鈴鐺查看；你也可以選擇同步寄送 Email，並在此查看寄送結果及重試失敗郵件。
        </p>
      </header>
      <AnnouncementManager announcements={items} />
    </div>
  );
}
