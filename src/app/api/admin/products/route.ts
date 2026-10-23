import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { isSafeImageUrl, optionalText, requireAdmin, slugify } from "@/lib/admin";
import { asBool, asInt, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";
import { getAllProductsForAdmin } from "@/lib/products";

type VariantInput = { id?: number; name: string; priceDelta: number; stock: number; isActive: boolean };

function parseVariants(value: unknown): VariantInput[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const result: VariantInput[] = [];
  for (const raw of value) {
    const record = raw as Record<string, unknown>;
    const name = asString(record.name, 40);
    if (!name) return null;
    const priceDelta = asInt(record.priceDelta, 0);
    const stock = asInt(record.stock, 0);
    if (!Number.isFinite(priceDelta) || priceDelta < -100000 || priceDelta > 100000) return null;
    if (!Number.isFinite(stock) || stock < 0 || stock > 100000) return null;
    result.push({ id: asInt(record.id, 0) || undefined, name, priceDelta, stock, isActive: asBool(record.isActive, true) });
  }
  return result;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const items = await getAllProductsForAdmin();
  return ok({ items });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const name = asString(body.name, 60);
  const price = asInt(body.price);
  const stock = asInt(body.stock, 0);
  const imageUrl = asString(body.imageUrl, 500);

  if (name.length < 2) return fail("請填寫商品名稱（至少 2 個字）。");
  if (!Number.isFinite(price) || price < 0 || price > 100000) return fail("請填寫有效的商品價格。");
  if (!Number.isFinite(stock) || stock < 0 || stock > 100000) return fail("請填寫有效的庫存數量。");
  if (!isSafeImageUrl(imageUrl)) return fail("圖片網址格式不正確，請使用 / 開頭的本機路徑或 https 網址。");

  const variants = parseVariants(body.variants);
  if (variants === null) return fail("商品規格格式不正確。");

  const slug = slugify(asString(body.slug, 80) || name);
  const categoryId = asInt(body.categoryId);

  try {
    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(products)
        .values({
          slug,
          name,
          categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null,
          summary: asString(body.summary, 200),
          description: asString(body.description, 4000),
          price,
          stock,
          isActive: asBool(body.isActive, true),
          imageUrl: imageUrl || null,
          ingredients: optionalText(body.ingredients, 1000),
          allergens: optionalText(body.allergens, 1000),
          storageInfo: optionalText(body.storageInfo, 1000),
          shelfLife: optionalText(body.shelfLife, 200),
          pickupNote: optionalText(body.pickupNote, 500),
          sortOrder: asInt(body.sortOrder, 0) || 0,
        })
        .returning({ id: products.id, slug: products.slug, name: products.name });
      const product = inserted[0];
      if (!product) throw new Error("insert failed");
      if (variants.length > 0) {
        await tx.insert(productVariants).values(
          variants.map((variant, index) => ({
            productId: product.id,
            name: variant.name,
            priceDelta: variant.priceDelta,
            stock: variant.stock,
            isActive: variant.isActive,
            sortOrder: index,
          })),
        );
      }
      return product;
    });
    await logAdminAction(admin, "product.create", "product", created.id, `新增商品 ${created.name}`);
    return ok({ product: created }, 201);
  } catch (error) {
    const message = error instanceof Error && error.message.includes("unique") ? "這個商品網址代稱已存在，請更換 slug。" : "新增商品失敗，請確認資料後再試。";
    return fail(message, 409);
  }
}

void eq;
