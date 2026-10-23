import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const values = {
    pickupIntro: asString(body.pickupIntro, 2000),
    orderingNotice: asString(body.orderingNotice, 4000),
    privacyNotice: asString(body.privacyNotice, 4000),
    termsText: asString(body.termsText, 8000),
    faqText: asString(body.faqText, 4000),
    cautionText: asString(body.cautionText, 4000),
    updatedAt: new Date(),
  };

  try {
    const existing = await db.select({ id: shopSettings.id }).from(shopSettings).where(eq(shopSettings.id, 1)).limit(1);
    if (existing[0]) {
      await db.update(shopSettings).set(values).where(eq(shopSettings.id, 1));
    } else {
      await db.insert(shopSettings).values({ id: 1, ...values });
    }
    await logAdminAction(admin, "content.update", "shop_settings", 1, "更新前台說明、條款與常見問題");
    return ok({ message: "商店內容已儲存。" });
  } catch {
    return fail("儲存商店內容失敗，請稍後再試。", 500);
  }
}
