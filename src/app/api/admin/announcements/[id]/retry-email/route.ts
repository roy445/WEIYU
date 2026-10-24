import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { sendPendingAnnouncementEmails } from "@/lib/announcements";
import { fail, ok } from "@/lib/api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("公告編號不正確。");

  const [announcement] = await db
    .select({ sendEmail: announcements.sendEmail })
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (!announcement) return fail("找不到公告。", 404);
  if (!announcement.sendEmail) return fail("這則公告未設定寄送 Email。");

  const pending = await db
    .select({ userId: announcementNotifications.userId })
    .from(announcementNotifications)
    .where(and(
      eq(announcementNotifications.announcementId, id),
      isNull(announcementNotifications.emailSentAt),
    ));
  const result = await sendPendingAnnouncementEmails(id);
  return ok({
    message: result.failed > 0
      ? `重試完成：寄出 ${result.sent} 封，仍有 ${result.failed} 封失敗。`
      : `重試完成：已寄出 ${result.sent} 封 Email。`,
    ...result,
    pendingBeforeRetry: pending.length,
  });
}
