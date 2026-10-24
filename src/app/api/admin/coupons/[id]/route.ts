import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asBool, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return fail("優惠券編號不正確。");

  const body = await readJson(request);
  if (typeof body.isActive !== "boolean") return fail("請選擇優惠券啟用狀態。");
  const rows = await db.update(coupons).set({ isActive: asBool(body.isActive) }).where(eq(coupons.id, id)).returning({ code: coupons.code });
  if (!rows[0]) return fail("找不到此優惠券。", 404);
  await logAdminAction(admin, "coupon.toggle", "coupon", id, `${rows[0].code} → ${body.isActive ? "啟用" : "停用"}`);
  return ok({ message: body.isActive ? "優惠券已啟用。" : "優惠券已停用。" });
}
