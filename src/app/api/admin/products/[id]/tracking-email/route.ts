import { and, desc, eq, gte, inArray, isNull, like, or } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements, emailDeliveryLogs, productTrackers, products, users } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { sendProductTrackingEmail } from "@/lib/email";

const MAX_RECIPIENTS = 200;

export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const { id: rawId } = await context.params;
  const productId = Number(rawId);
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail("商品編號不正確。", 400);

  const [product] = await db.select({ id: products.id, name: products.name, slug: products.slug, stock: products.stock, isActive: products.isActive })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return fail("找不到這項商品。", 404);
  if (!product.isActive || product.stock <= 0) return fail("商品目前未上架或已缺貨，為避免寄出過期的補貨通知，沒有送出 Email。", 409);

  const [event] = await db.select({ id: announcements.id, body: announcements.body, publishedAt: announcements.publishedAt })
    .from(announcements)
    .where(and(
      eq(announcements.title, `商品追蹤提醒｜${product.name}`),
      like(announcements.body, "%補貨%"),
    ))
    .orderBy(desc(announcements.publishedAt), desc(announcements.id))
    .limit(1);
  if (!event) return fail("找不到此商品的補貨追蹤通知，沒有寄出 Email。", 404);

  const changes = event.body.split("\n").map((line) => line.trim()).filter(Boolean);
  const pending = await db.select({
    userId: users.id,
    email: users.email,
  })
    .from(announcementNotifications)
    .innerJoin(users, eq(users.id, announcementNotifications.userId))
    .innerJoin(productTrackers, and(
      eq(productTrackers.userId, announcementNotifications.userId),
      eq(productTrackers.productId, productId),
    ))
    .where(and(
      eq(announcementNotifications.announcementId, event.id),
      eq(productTrackers.emailEnabled, true),
      isNull(announcementNotifications.emailSentAt),
    ));

  // Newer logs include this event id. Also recognize legacy logs created after the event.
  const sentRows = pending.length ? await db.select({ email: emailDeliveryLogs.recipientEmail })
    .from(emailDeliveryLogs)
    .where(and(
      eq(emailDeliveryLogs.status, "sent"),
      inArray(emailDeliveryLogs.recipientEmail, pending.map((recipient) => recipient.email)),
      or(
        eq(emailDeliveryLogs.reason, `會員追蹤商品更新通知：${product.name}｜事件 #${event.id}`),
        and(
          eq(emailDeliveryLogs.reason, `會員追蹤商品更新通知：${product.name}`),
          gte(emailDeliveryLogs.createdAt, event.publishedAt),
        ),
      ),
    )) : [];
  const alreadySent = new Set(sentRows.map((row) => row.email));
  const eligible = pending.filter((recipient) => !alreadySent.has(recipient.email));

  if (!eligible.length) return ok({ message: "此批補貨通知的 Email 已成功寄出，或目前沒有同意 Email 通知且待寄送的追蹤會員。", sent: 0, failed: 0, skipped: pending.length });
  if (eligible.length > MAX_RECIPIENTS) {
    return fail(`目前有 ${eligible.length} 位符合條件，單次補寄上限為 ${MAX_RECIPIENTS} 位；為避免大量重複寄送，未寄出任何郵件。`, 400, { eligible: eligible.length });
  }

  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < eligible.length; offset += 3) {
    const batch = eligible.slice(offset, offset + 3);
    const results = await Promise.all(batch.map(async (recipient) => {
      try {
        await sendProductTrackingEmail(recipient.email, { ...product, changes }, event.id);
        await db.update(announcementNotifications)
          .set({ emailSentAt: new Date(), emailError: null })
          .where(and(eq(announcementNotifications.announcementId, event.id), eq(announcementNotifications.userId, recipient.userId)));
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : "unknown";
        console.error("Manual product tracking email retry failed", { productId, announcementId: event.id, userId: recipient.userId, message });
        await db.update(announcementNotifications)
          .set({ emailError: message })
          .where(and(eq(announcementNotifications.announcementId, event.id), eq(announcementNotifications.userId, recipient.userId)))
          .catch(() => undefined);
        return false;
      }
    }));
    sent += results.filter(Boolean).length;
    failed += results.length - results.filter(Boolean).length;
  }

  return ok({
    message: failed ? `補寄完成：${sent} 封成功、${failed} 封失敗。` : `已補寄 ${sent} 封商品追蹤 Email。`,
    sent,
    failed,
    skipped: pending.length - eligible.length,
    announcementId: event.id,
  });
}
