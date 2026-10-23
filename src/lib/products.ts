import "server-only";

import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, productVariants, products, type Product, type ProductVariant } from "@/db/schema";

export type ProductListItem = Omit<Product, "viewCount" | "cartAddCount"> & {
  categoryName: string | null;
  categorySlug: string | null;
};

export type ProductFilters = {
  q?: string;
  category?: string;
  sort?: string;
  includeInactive?: boolean;
};

export type ProductDetail = {
  product: Product;
  categoryName: string | null;
  categorySlug: string | null;
  variants: ProductVariant[];
};

export async function listCategories() {
  try {
    return await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  } catch {
    return [];
  }
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductListItem[]> {
  const conditions: SQL[] = [];
  if (!filters.includeInactive) conditions.push(eq(products.isActive, true));
  if (filters.category && filters.category !== "all") {
    conditions.push(eq(categories.slug, filters.category));
  }
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${q}%`;
    const search = or(
      ilike(products.name, pattern),
      ilike(products.summary, pattern),
      ilike(products.description, pattern),
    );
    if (search) conditions.push(search);
  }

  let orderBy;
  switch (filters.sort) {
    case "price_asc":
      orderBy = [asc(products.price), asc(products.id)];
      break;
    case "price_desc":
      orderBy = [desc(products.price), asc(products.id)];
      break;
    case "name":
      orderBy = [asc(products.name)];
      break;
    default:
      orderBy = [desc(products.createdAt), desc(products.id)];
  }

  try {
    const query = db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        categoryId: products.categoryId,
        summary: products.summary,
        description: products.description,
        price: products.price,
        stock: products.stock,
        isActive: products.isActive,
        imageUrl: products.imageUrl,
        ingredients: products.ingredients,
        allergens: products.allergens,
        storageInfo: products.storageInfo,
        shelfLife: products.shelfLife,
        pickupNote: products.pickupNote,
        sortOrder: products.sortOrder,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const rows = conditions.length
      ? await query.where(and(...conditions)).orderBy(...orderBy)
      : await query.orderBy(...orderBy);
    return rows;
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const rows = await db
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, row.product.id))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));
    return {
      product: row.product,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      variants: variants.filter((variant) => variant.isActive),
    };
  } catch {
    return null;
  }
}

export async function getAllProductsForAdmin(q?: string): Promise<ProductListItem[]> {
  return listProducts({ includeInactive: true, q, sort: "newest" });
}
