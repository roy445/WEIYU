import { asc } from "drizzle-orm";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asInt, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

const UNITS = new Set(["g", "ml", "piece"]);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const items = await db.select().from(materials).orderBy(asc(materials.name));
  return ok({ items });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
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
    const [item] = await db.insert(materials).values({
      name,
      unit,
      packageQuantityMilli,
      purchaseCost,
    }).returning();
    if (item) await logAdminAction(admin, "material.create", "material", item.id, `新增材料 ${item.name}`);
    return ok({ item }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) return fail("已存在同名材料，請使用不同名稱。", 409);
    console.error("Material creation failed", error instanceof Error ? error.message : "unknown");
    return fail("材料新增失敗，請稍後再試。", 500);
  }
}
