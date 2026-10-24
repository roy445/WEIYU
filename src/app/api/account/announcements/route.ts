import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { asInt, asBool, fail, ok, readJson } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);

  const summary = new URL(request.url).searchParams.get("summary") === "1";
  const unread = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(announcementNotifications)
    .where(and(
      eq(announcementNotifications.userId, user.id),
      isNull(announcementNotifications.readAt),
    ));
  const unreadCount = Number(unread[0]?.count ?? 0);

  if (summary) return ok({ unreadCount });

  const items = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      type: announcements.type,
      displayMode: announcements.displayMode,
      publishedAt: announcements.publishedAt,
      readAt: announcementNotifications.readAt,
    })
    .from(announcementNotifications)
    .innerJoin(announcements, eq(announcementNotifications.announcementId, announcements.id))
    .where(eq(announcementNotifications.userId, user.id))
    .orderBy(desc(announcements.publishedAt))
    .limit(100);

  return ok({ announcements: items, unreadCount });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);

  const body = await readJson(request);
  const readAll = asBool(body.readAll);
  const announcementId = asInt(body.announcementId);
  if (readAll) {
    await db
      .update(announcementNotifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(announcementNotifications.userId, user.id),
        isNull(announcementNotifications.readAt),
      ));
    return ok({ message: "所有公告已標示為已讀。" });
  }
  if (!Number.isSafeInteger(announcementId) || announcementId <= 0) return fail("公告編號不正確。");

  await db
    .update(announcementNotifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(announcementNotifications.userId, user.id),
      eq(announcementNotifications.announcementId, announcementId),
      isNull(announcementNotifications.readAt),
    ));
  return ok({ message: "公告已標示為已讀。" });
}
