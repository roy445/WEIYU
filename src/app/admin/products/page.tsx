import type { Metadata } from "next";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productVariants } from "@/db/schema";
import { ProductManager, type AdminProduct } from "@/components/admin/product-manager";
import { getAllProductsForAdmin, listCategories } from "@/lib/products";

export const metadata: Metadata = { title: "商品管理" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const [products, categories] = await Promise.all([getAllProductsForAdmin(), listCategories()]);
  const ids = products.map((product) => product.id);
  const variants = ids.length
    ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids)).orderBy(asc(productVariants.sortOrder), asc(productVariants.id))
    : [];

  const items: AdminProduct[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    summary: product.summary,
    description: product.description,
    price: product.price,
    stock: product.stock,
    isActive: product.isActive,
    imageUrl: product.imageUrl,
    ingredients: product.ingredients,
    allergens: product.allergens,
    storageInfo: product.storageInfo,
    shelfLife: product.shelfLife,
    pickupNote: product.pickupNote,
    sortOrder: product.sortOrder,
    variants: variants
      .filter((variant) => variant.productId === product.id)
      .map((variant) => ({ id: variant.id, name: variant.name, priceDelta: variant.priceDelta, stock: variant.stock, isActive: variant.isActive })),
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Products</p>
        <h1 className="mt-3 text-3xl">商品管理</h1>
        <p className="mt-2 text-sm text-cocoa-soft">新增、編輯、上下架與調整庫存。成分、過敏原與保存資訊請如實填寫。</p>
      </div>
      <ProductManager products={items} categories={categories.map((category) => ({ id: category.id, name: category.name }))} initialFilter={filter} />
    </div>
  );
}
