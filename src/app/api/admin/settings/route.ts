import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopSettings } from "@/db/schema";
import { isSafeImageUrl, optionalText, requireAdmin } from "@/lib/admin";
import { asBool, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const shopName = asString(body.shopName, 60);
  if (shopName.length < 2) return fail("請填寫品牌名稱。");
  const tagline = asString(body.tagline, 60);
  if (!tagline) return fail("請填寫品牌標語。");

  const logoUrl = asString(body.logoUrl, 500);
  if (logoUrl && !isSafeImageUrl(logoUrl)) return fail("LOGO 圖片網址格式不正確，請使用 / 開頭的本機路徑或 https 網址。");

  const values = {
    shopName,
    brandNameEn: asString(body.brandNameEn, 30) || "WEIYU",
    tagline,
    logoUrl: logoUrl || null,
    contactEmail: optionalText(body.contactEmail, 160),
    contactPhone: optionalText(body.contactPhone, 40),
    contactSocial: optionalText(body.contactSocial, 500),
    isAcceptingOrders: asBool(body.isAcceptingOrders, true),
    updatedAt: new Date(),
  };

  try {
    const existing = await db.select({ id: shopSettings.id }).from(shopSettings).where(eq(shopSettings.id, 1)).limit(1);
    if (existing[0]) {
      await db.update(shopSettings).set(values).where(eq(shopSettings.id, 1));
    } else {
      await db.insert(shopSettings).values({ id: 1, ...values });
    }
    await logAdminAction(admin, "settings.update", "shop_settings", 1, `接單狀態：${values.isAcceptingOrders ? "開放" : "暫停"}`);
    return ok({ message: "商店設定已儲存。" });
  } catch {
    return fail("儲存商店設定失敗。", 500);
  }
}
