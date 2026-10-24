import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { announcementNotifications, announcements, users } from "@/db/schema";
import { sendAnnouncementEmail } from "@/lib/email";

export async function sendPendingAnnouncementEmails(announcementId: number): Promise<{ sent: number; failed: number }> {
  const pending = await db
    .select({
      userId: announcementNotifications.userId,
      email: users.email,
      title: announcements.title,
      body: announcements.body,
    })
    .from(announcementNotifications)
    .innerJoin(users, eq(announcementNotifications.userId, users.id))
    .innerJoin(announcements, eq(announcementNotifications.announcementId, announcements.id))
    .where(and(
      eq(announcementNotifications.announcementId, announcementId),
      isNull(announcementNotifications.emailSentAt),
    ));

  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < pending.length; offset += 3) {
    const batch = pending.slice(offset, offset + 3);
    const outcomes = await Promise.all(batch.map(async (recipient) => {
      try {
        await sendAnnouncementEmail(recipient.email, recipient.title, recipient.body, announcementId);
        await db
          .update(announcementNotifications)
          .set({ emailSentAt: new Date(), emailError: null })
          .where(and(
            eq(announcementNotifications.announcementId, announcementId),
            eq(announcementNotifications.userId, recipient.userId),
          ));
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error";
        console.error("Announcement email failed", { announcementId, error: message });
        await db
          .update(announcementNotifications)
          .set({ emailError: message })
          .where(and(
            eq(announcementNotifications.announcementId, announcementId),
            eq(announcementNotifications.userId, recipient.userId),
          ));
        return false;
      }
    }));
    sent += outcomes.filter(Boolean).length;
    failed += outcomes.length - outcomes.filter(Boolean).length;
  }

  return { sent, failed };
}
