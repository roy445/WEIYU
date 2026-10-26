import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, productVariants, products } from "@/db/schema";
import { isSafeImageUrl, optionalText, parseImageGallery, requireAdmin, slugify } from "@/lib/admin";
import { asBool, asInt, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";
import { notifyProductTrackersForChange } from "@/lib/product-tracking";

type VariantInput = { name: string; priceDelta: number; stock: number; isActive: boolean };

function parseVariants(value: unknown): VariantInput[] | null {
  if (!Array.isArray(value)) return null;
  const result: VariantInput[] = [];
  for (const raw of value) {
    const record = raw as Record<string, unknown>;
    const name = asString(record.name, 40);
    if (!name) return null;
    const priceDelta = asInt(record.priceDelta, 0);
    const stock = asInt(record.stock, 0);
    if (priceDelta < -100000 || priceDelta > 100000 || stock < 0 || stock > 100000) return null;
    result.push({ name, priceDelta, stock, isActive: asBool(record.isActive, true) });
  }
  return result;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return fail("商品編號不正確。");

  const body = await readJson(request);

  try {
    const existingRows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing) return fail("找不到這個商品。", 404);

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if ("name" in body) {
      const name = asString(body.name, 60);
      if (name.length < 2) return fail("請填寫商品名稱（至少 2 個字）。");
      patch.name = name;
    }
    if ("slug" in body) {
      const slug = slugify(asString(body.slug, 80) || existing.name);
      patch.slug = slug;
    }
    if ("categoryId" in body) {
      const categoryId = asInt(body.categoryId);
      patch.categoryId = Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null;
    }
    if ("summary" in body) patch.summary = asString(body.summary, 200);
    if ("description" in body) patch.description = asString(body.description, 4000);
    if ("price" in body) {
      const price = asInt(body.price);
      if (!Number.isFinite(price) || price < 0 || price > 100000) return fail("請填寫有效的商品價格。");
      patch.price = price;
    }
    if ("stock" in body) {
      const stock = asInt(body.stock);
      if (!Number.isFinite(stock) || stock < 0 || stock > 100000) return fail("請填寫有效的庫存數量。");
      patch.stock = stock;
    }
    if ("isActive" in body) patch.isActive = asBool(body.isActive, existing.isActive);
    if ("imageUrl" in body) {
      const imageUrl = asString(body.imageUrl, 500);
      if (!isSafeImageUrl(imageUrl)) return fail("圖片網址格式不正確。");
      patch.imageUrl = imageUrl || null;
    }
    if ("galleryImages" in body) {
      const galleryImages = parseImageGallery(body.galleryImages);
      if (galleryImages === null) return fail("商品圖片圖集最多 8 張，且每個網址都必須是安全圖片網址。");
      patch.galleryImages = galleryImages;
    }
    if ("ingredients" in body) patch.ingredients = optionalText(body.ingredients, 1000);
    if ("internalRecipe" in body) patch.internalRecipe = optionalText(body.internalRecipe, 12000);
    if ("launchAt" in body) {
      if (body.launchAt == null || body.launchAt === "") {
        patch.launchAt = null;
      } else {
        const launchAt = new Date(asString(body.launchAt, 40));
        if (Number.isNaN(launchAt.getTime())) return fail("預計上架時間格式不正確。");
        patch.launchAt = launchAt;
      }
    }
    if ("allergens" in body) patch.allergens = optionalText(body.allergens, 1000);
    if ("storageInfo" in body) patch.storageInfo = optionalText(body.storageInfo, 1000);
    if ("requiresRefrigeration" in body) patch.requiresRefrigeration = body.requiresRefrigeration == null ? null : asBool(body.requiresRefrigeration, existing.requiresRefrigeration ?? false);
    if ("shelfLife" in body) patch.shelfLife = optionalText(body.shelfLife, 200);
    if ("pickupNote" in body) patch.pickupNote = optionalText(body.pickupNote, 500);
    if ("sortOrder" in body) patch.sortOrder = asInt(body.sortOrder, existing.sortOrder) || 0;

    const variants = "variants" in body ? parseVariants(body.variants) : null;
    if ("variants" in body && variants === null) return fail("商品規格格式不正確。");

    await db.transaction(async (tx) => {
      await tx.update(products).set(patch).where(eq(products.id, id));
      if (variants) {
        await tx.delete(productVariants).where(eq(productVariants.productId, id));
        if (variants.length > 0) {
          await tx.insert(productVariants).values(
            variants.map((variant, index) => ({
              productId: id,
              name: variant.name,
              priceDelta: variant.priceDelta,
              stock: variant.stock,
              isActive: variant.isActive,
              sortOrder: index,
            })),
          );
        }
      }
    });

    await logAdminAction(
      admin,
      "product.update",
      "product",
      id,
      `更新商品 ${String(patch.name ?? existing.name)}`,
    );
    const alert = await notifyProductTrackersForChange(id, {
      ...(typeof patch.price === "number" && patch.price !== existing.price ? { oldPrice: existing.price, newPrice: patch.price } : {}),
      ...(typeof patch.stock === "number" && patch.stock !== existing.stock ? { oldStock: existing.stock, newStock: patch.stock } : {}),
      isActive: typeof patch.isActive === "boolean" ? patch.isActive : existing.isActive,
    });
    const notificationWarning = alert.warning ?? (alert.emailFailed > 0 ? `商品已更新，${alert.emailFailed} 封追蹤通知 Email 寄送失敗。` : undefined);
    return ok({
      message: notificationWarning ? `商品已更新。${notificationWarning}` : "商品已更新。",
      notificationWarning,
    });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("unique") ? "商品網址代稱重複，請更換。" : "更新商品失敗，請再試一次。";
    return fail(message, 409);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return fail("商品編號不正確。");

  try {
    const referenced = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, id))
      .limit(1);
    if (referenced[0]) {
      await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id));
      await logAdminAction(admin, "product.archive", "product", id, "商品已有訂單紀錄，改為下架");
      return ok({ message: "這項商品已有訂單紀錄，已改為下架，以保留歷史訂單資料。", archived: true });
    }
    await db.delete(products).where(eq(products.id, id));
    await logAdminAction(admin, "product.delete", "product", id, "刪除商品");
    return ok({ message: "商品已刪除。", archived: false });
  } catch {
    return fail("刪除商品失敗，請再試一次。", 500);
  }
}
