import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { sendPendingAnnouncementEmails } from "@/lib/announcements";
import { asString, fail, ok, readJson } from "@/lib/api";

const TYPES = new Set(["info", "important", "promotion"]);
const DISPLAY_MODES = new Set(["inbox", "marquee", "pinned"]);

export const maxDuration = 60;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

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
  return ok({ announcements: items });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const title = asString(body.title, 100);
  const announcementBody = asString(body.body, 3000);
  const type = asString(body.type, 20);
  const displayMode = asString(body.displayMode, 20);
  const sendEmail = body.sendEmail === true;
  if (sendEmail && body.emailReviewed !== true) return fail("請先預覽 Email 格式並確認後再發布。", 400);

  if (title.length < 2) return fail("公告標題至少需要 2 個字。");
  if (!announcementBody) return fail("請填寫公告內容。");
  if (!TYPES.has(type)) return fail("公告類型不正確。");
  if (!DISPLAY_MODES.has(displayMode)) return fail("公告呈現方式不正確。");

  let result: { id: number; recipientCount: number };
  try {
    result = await db.transaction(async (tx) => {
      const [announcement] = await tx
        .insert(announcements)
        .values({ title, body: announcementBody, type, displayMode, sendEmail, createdBy: admin.id })
        .returning({ id: announcements.id });

      const recipients = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "customer"));

      if (recipients.length > 0) {
        await tx.insert(announcementNotifications).values(
          recipients.map((recipient) => ({ announcementId: announcement.id, userId: recipient.id })),
        );
      }
      return { id: announcement.id, recipientCount: recipients.length };
    });

    if (!sendEmail) {
      return ok({
        message: "公告已發布，站內通知已送達。",
        announcementId: result.id,
        recipientCount: result.recipientCount,
        emailSent: 0,
        emailFailed: 0,
      }, 201);
    }

    let delivery: { sent: number; failed: number };
    try {
      delivery = await sendPendingAnnouncementEmails(result.id);
    } catch (error) {
      console.error("Announcement email processing failed", error instanceof Error ? error.message : "unknown");
      return ok({
        message: "公告已發布，但郵件寄送處理未完成；請在公告管理查看狀態後重試。",
        announcementId: result.id,
        recipientCount: result.recipientCount,
        emailSent: 0,
        emailFailed: result.recipientCount,
      }, 201);
    }
    return ok({
      message: delivery.failed > 0
        ? `公告已發布；${delivery.sent} 封 Email 寄出，${delivery.failed} 封失敗，可稍後重試。`
        : `公告已發布；已寄出 ${delivery.sent} 封 Email。`,
      announcementId: result.id,
      recipientCount: result.recipientCount,
      ...{ emailSent: delivery.sent, emailFailed: delivery.failed },
    }, 201);
  } catch (error) {
    console.error("Announcement publish failed", error instanceof Error ? error.message : "unknown");
    return fail("公告發布失敗，請稍後再試。", 500);
  }
}
