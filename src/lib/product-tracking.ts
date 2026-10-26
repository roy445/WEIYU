import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements, productTrackers, products, users } from "@/db/schema";
import { sendProductTrackingEmail } from "@/lib/email";

type ProductChange = {
  oldPrice?: number;
  newPrice?: number;
  oldStock?: number;
  newStock?: number;
  restockedVariants?: string[];
  isActive?: boolean;
};

export async function notifyProductTrackersForChange(productId: number, change: ProductChange) {
  const changes: string[] = [];
  if (change.oldPrice !== undefined && change.newPrice !== undefined && change.newPrice < change.oldPrice) {
    changes.push(`價格由 NT$${change.oldPrice} 降至 NT$${change.newPrice}。`);
  }
  if (change.oldStock !== undefined && change.newStock !== undefined) {
    if (change.oldStock === 0 && change.newStock > 0 && !change.restockedVariants?.length) {
      changes.push("商品已補貨，現在有庫存。");
    } else if (change.oldStock > 0 && change.newStock === 0) {
      changes.push("商品目前已售罄。");
    } else if (change.oldStock > 2 && change.newStock > 0 && change.newStock <= 2) {
      changes.push(`商品庫存偏低，目前剩餘 ${change.newStock} 件。`);
    }
  }
  if (change.restockedVariants?.length) {
    changes.push(`${change.restockedVariants.join("、")} 口味已補貨，現在可以選擇。`);
  }
  if (!changes.length || change.isActive === false) return { notificationCount: 0, emailEligible: 0, emailSent: 0, emailFailed: 0 };

  try {
    const [product] = await db.select({ name: products.name, slug: products.slug })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) return { notificationCount: 0, emailEligible: 0, emailSent: 0, emailFailed: 0 };
    const recipients = await db.select({
      userId: productTrackers.userId,
      email: users.email,
      emailEnabled: productTrackers.emailEnabled,
    })
      .from(productTrackers)
      .innerJoin(users, eq(users.id, productTrackers.userId))
      .where(eq(productTrackers.productId, productId));
    if (!recipients.length) return { notificationCount: 0, emailEligible: 0, emailSent: 0, emailFailed: 0 };

    const title = `商品追蹤提醒｜${product.name}`;
    const [announcement] = await db.transaction(async (tx) => {
      const inserted = await tx.insert(announcements).values({
        title,
        body: changes.join("\n"),
        type: "promotion",
        displayMode: "inbox",
        sendEmail: false,
      }).returning({ id: announcements.id });
      const created = inserted[0];
      if (!created) throw new Error("Product tracking announcement insert returned no row.");
      for (let offset = 0; offset < recipients.length; offset += 500) {
        const batch = recipients.slice(offset, offset + 500);
        await tx.insert(announcementNotifications).values(batch.map((recipient) => ({
          announcementId: created.id,
          userId: recipient.userId,
        })));
      }
      return inserted;
    });

    const emailRecipients = recipients.filter((recipient) => recipient.emailEnabled);
    let emailSent = 0;
    let emailFailed = 0;
    for (let offset = 0; offset < emailRecipients.length; offset += 3) {
      const batch = emailRecipients.slice(offset, offset + 3);
      const results = await Promise.all(batch.map(async (recipient) => {
        try {
          await sendProductTrackingEmail(recipient.email, { ...product, changes }, announcement.id);
          await db.update(announcementNotifications)
            .set({ emailSentAt: new Date(), emailError: null })
            .where(and(eq(announcementNotifications.announcementId, announcement.id), eq(announcementNotifications.userId, recipient.userId)));
          return { sent: true };
        } catch (error) {
          const message = error instanceof Error ? error.message.slice(0, 500) : "unknown";
          console.error("Product tracking email failed", {
            announcementId: announcement.id,
            userId: recipient.userId,
            error: message,
          });
          await db.update(announcementNotifications)
            .set({ emailError: message })
            .where(and(eq(announcementNotifications.announcementId, announcement.id), eq(announcementNotifications.userId, recipient.userId)))
            .catch(() => undefined);
          return { sent: false };
        }
      }));
      emailSent += results.filter((result) => result.sent).length;
      emailFailed += results.filter((result) => !result.sent).length;
    }
    return { notificationCount: recipients.length, emailEligible: emailRecipients.length, emailSent, emailFailed };
  } catch (error) {
    console.error("Product tracking notification creation failed", error instanceof Error ? error.message : "unknown");
    return { notificationCount: 0, emailEligible: 0, emailSent: 0, emailFailed: 0, warning: "商品已更新，但追蹤通知未能完整建立，請檢查伺服器記錄。" };
  }
}
