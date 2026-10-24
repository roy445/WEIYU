import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, productCostSettings, productRecipeItems, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asInt, fail, ok, readJson } from "@/lib/api";
import { getProductCost } from "@/lib/product-costs";
import { logAdminAction } from "@/lib/orders";

async function productIdFrom(context: { params: Promise<{ id: string }> }): Promise<number> {
  const id = Number((await context.params).id);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const productId = await productIdFrom(context);
  if (!productId) return fail("商品編號不正確。");
  const [product, cost] = await Promise.all([
    db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1),
    getProductCost(productId),
  ]);
  if (!product[0]) return fail("找不到這項商品。", 404);
  return ok(cost);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const productId = await productIdFrom(context);
  if (!productId) return fail("商品編號不正確。");
  const body = await readJson(request);
  const batchYield = asInt(body.batchYield);
  const laborCost = asInt(body.laborCost, 0);
  const overheadCost = asInt(body.overheadCost, 0);
  const wasteBasisPoints = asInt(body.wasteBasisPoints, 0);
  const targetMarginBasisPoints = asInt(body.targetMarginBasisPoints, 5000);
  if (!Number.isSafeInteger(batchYield) || batchYield < 1 || batchYield > 100_000) return fail("每批成品數量需介於 1 至 100,000。");
  if (![laborCost, overheadCost].every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000)) return fail("工時與水電等批次成本需為 0 至 10,000,000 的整數。");
  if (!Number.isSafeInteger(wasteBasisPoints) || wasteBasisPoints < 0 || wasteBasisPoints > 10_000) return fail("耗損比例需介於 0% 至 100%。");
  if (!Number.isSafeInteger(targetMarginBasisPoints) || targetMarginBasisPoints < 0 || targetMarginBasisPoints > 9_900) return fail("目標毛利率需介於 0% 至 99%。");
  if (!Array.isArray(body.recipe) || body.recipe.length > 100) return fail("配方材料格式不正確，最多可加入 100 種材料。");
  const validRecipe: { materialId: number; amountMilli: number }[] = [];
  for (const raw of body.recipe) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("配方材料格式不正確。");
    const record = raw as Record<string, unknown>;
    const materialId = asInt(record.materialId);
    const amountMilli = asInt(record.amountMilli);
    if (!Number.isSafeInteger(materialId) || materialId <= 0 || !Number.isSafeInteger(amountMilli) || amountMilli <= 0 || amountMilli > 1_000_000_000) {
      return fail("每項配方材料都需選擇有效材料及大於 0 的用量。");
    }
    validRecipe.push({ materialId, amountMilli });
  }
  if (new Set(validRecipe.map((item) => item.materialId)).size !== validRecipe.length) return fail("同一種材料請合併成一筆用量。");

  const product = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product[0]) return fail("找不到這項商品。", 404);
  const materialIds = validRecipe.map((item) => item.materialId);
  if (materialIds.length) {
    const found = await db.select({ id: materials.id }).from(materials).where(inArray(materials.id, materialIds));
    if (found.length !== materialIds.length) return fail("配方包含不存在的材料，請重新整理後再試。", 409);
  }
  try {
    await db.transaction(async (tx) => {
      await tx.insert(productCostSettings).values({
        productId,
        batchYield,
        laborCost,
        overheadCost,
        wasteBasisPoints,
        targetMarginBasisPoints,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: productCostSettings.productId,
        set: { batchYield, laborCost, overheadCost, wasteBasisPoints, targetMarginBasisPoints, updatedAt: new Date() },
      });
      await tx.delete(productRecipeItems).where(eq(productRecipeItems.productId, productId));
      if (validRecipe.length) {
        await tx.insert(productRecipeItems).values(validRecipe.map((item) => ({ productId, ...item })));
      }
    });
  } catch (error) {
    console.error("Product cost update failed", error instanceof Error ? error.message : "unknown");
    return fail("成本配方儲存失敗，資料沒有更新，請稍後再試。", 500);
  }
  await logAdminAction(admin, "product.cost.update", "product", productId, "更新商品成本配方與毛利率建議");
  return ok({ message: "成本配方與定價設定已儲存。" });
}
