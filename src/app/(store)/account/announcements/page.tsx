import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AnnouncementInbox } from "@/components/announcement-inbox";
import { db } from "@/db";
import { announcementNotifications, announcements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "公告通知" };

export default async function AccountAnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/announcements");

  const items = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      type: announcements.type,
      publishedAt: announcements.publishedAt,
      readAt: announcementNotifications.readAt,
    })
    .from(announcementNotifications)
    .innerJoin(announcements, eq(announcementNotifications.announcementId, announcements.id))
    .where(eq(announcementNotifications.userId, user.id))
    .orderBy(desc(announcements.publishedAt))
    .limit(100);

  return (
    <div className="container-wy py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Announcements</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">公告通知</h1>
        <p className="mt-3 mb-8 text-sm leading-relaxed text-cocoa-soft">在這裡查看店家發布的最新消息與重要提醒。</p>
        <AnnouncementInbox announcements={items} />
      </div>
    </div>
  );
}
