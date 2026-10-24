import { and, asc, eq, gt, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { productLaunchReminders, products } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { deleteExpiredPendingRegistrations } from "@/lib/auth";
import { sendProductLaunchEmail } from "@/lib/email";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("排程通知尚未設定 CRON_SECRET。", 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return fail("未授權。", 401);

  const expiredRegistrationsDeleted = await deleteExpiredPendingRegistrations();
  const due = await db
    .select({
      id: productLaunchReminders.id,
      email: productLaunchReminders.email,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      summary: products.summary,
    })
    .from(productLaunchReminders)
    .innerJoin(products, eq(productLaunchReminders.productId, products.id))
    .where(and(
      isNull(productLaunchReminders.emailSentAt),
      eq(products.isActive, true),
      lte(products.launchAt, new Date()),
      gt(products.price, 0),
      gt(products.stock, 0),
    ))
    .orderBy(asc(productLaunchReminders.id))
    .limit(100);

  let sent = 0;
  let failed = 0;
  for (const reminder of due) {
    try {
      await sendProductLaunchEmail(reminder.email, {
        name: reminder.name,
        slug: reminder.slug,
        summary: reminder.summary,
      });
      await db
        .update(productLaunchReminders)
        .set({ emailSentAt: new Date(), emailError: null })
        .where(eq(productLaunchReminders.id, reminder.id));
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "unknown";
      console.error("Product launch reminder email failed", { reminderId: reminder.id, productId: reminder.productId, message });
      await db
        .update(productLaunchReminders)
        .set({ emailError: message })
        .where(eq(productLaunchReminders.id, reminder.id));
      failed += 1;
    }
  }

  return ok({ processed: due.length, sent, failed, expiredRegistrationsDeleted });
}
