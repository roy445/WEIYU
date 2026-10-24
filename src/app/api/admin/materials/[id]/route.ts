import { eq } from "drizzle-orm";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asInt, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

const UNITS = new Set(["g", "ml", "piece"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("材料編號不正確。");
  const body = await readJson(request);
  const name = asString(body.name, 100).trim();
  const unit = asString(body.unit, 10);
  const packageQuantityMilli = asInt(body.packageQuantityMilli);
  const purchaseCost = asInt(body.purchaseCost);
  if (!name) return fail("請填寫材料名稱。");
  if (!UNITS.has(unit)) return fail("材料單位不正確。");
  if (!Number.isSafeInteger(packageQuantityMilli) || packageQuantityMilli < 1 || packageQuantityMilli > 1_000_000_000) {
    return fail("包裝數量需大於 0 且不超過 1,000,000。");
  }
  if (!Number.isSafeInteger(purchaseCost) || purchaseCost < 0 || purchaseCost > 10_000_000) return fail("請填寫有效的材料購買價格。");
  try {
    const [item] = await db.update(materials)
      .set({ name, unit, packageQuantityMilli, purchaseCost, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning({ id: materials.id });
    if (!item) return fail("找不到這項材料。", 404);
    await logAdminAction(admin, "material.update", "material", id, `更新材料 ${name}`);
    return ok({ message: "材料成本已更新。" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) return fail("已存在同名材料，請使用不同名稱。", 409);
    console.error("Material update failed", error instanceof Error ? error.message : "unknown");
    return fail("材料更新失敗，請稍後再試。", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("材料編號不正確。");
  try {
    const [deleted] = await db.delete(materials).where(eq(materials.id, id)).returning({ id: materials.id });
    if (deleted) await logAdminAction(admin, "material.delete", "material", id, "刪除材料");
    return deleted ? ok({ message: "材料已刪除。" }) : fail("找不到這項材料。", 404);
  } catch (error) {
    if (error instanceof Error && error.message.includes("foreign key")) return fail("此材料已用於商品配方，請先從配方移除後再刪除。", 409);
    console.error("Material deletion failed", error instanceof Error ? error.message : "unknown");
    return fail("材料刪除失敗，請稍後再試。", 500);
  }
}
