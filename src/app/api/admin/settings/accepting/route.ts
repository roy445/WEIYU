import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asBool, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const body = await readJson(request);
  if (typeof body.isAcceptingOrders !== "boolean") return fail("請提供接單狀態。");
  const value = asBool(body.isAcceptingOrders, true);
  try {
    const existing = await db.select({ id: shopSettings.id }).from(shopSettings).where(eq(shopSettings.id, 1)).limit(1);
    if (existing[0]) {
      await db.update(shopSettings).set({ isAcceptingOrders: value, updatedAt: new Date() }).where(eq(shopSettings.id, 1));
    } else {
      await db.insert(shopSettings).values({ id: 1, isAcceptingOrders: value });
    }
    await logAdminAction(admin, value ? "settings.accepting.on" : "settings.accepting.off", "shop_settings", 1);
    return ok({ isAcceptingOrders: value });
  } catch {
    return fail("更新接單狀態失敗。", 500);
  }
}
