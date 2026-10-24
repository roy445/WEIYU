import "server-only";

import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, productVariants, products, type Product, type ProductVariant } from "@/db/schema";

export type ProductListItem = Omit<Product, "viewCount" | "cartAddCount" | "internalRecipe"> & {
  categoryName: string | null;
  categorySlug: string | null;
  isComingSoon: boolean;
};

export type AdminProductListItem = ProductListItem & Pick<Product, "internalRecipe">;

export type ProductFilters = {
  q?: string;
  category?: string;
  sort?: string;
  includeInactive?: boolean;
};

export type ProductDetail = {
  product: Omit<Product, "internalRecipe">;
  categoryName: string | null;
  categorySlug: string | null;
  variants: ProductVariant[];
  isComingSoon: boolean;
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
        launchAt: products.launchAt,
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
    const now = Date.now();
    return rows.map((row) => ({
      ...row,
      isComingSoon: Boolean(row.launchAt && row.launchAt.getTime() > now),
    }));
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const rows = await db
      .select({
        product: {
          id: products.id,
          slug: products.slug,
          name: products.name,
          categoryId: products.categoryId,
          summary: products.summary,
          description: products.description,
          price: products.price,
          stock: products.stock,
          isActive: products.isActive,
          viewCount: products.viewCount,
          cartAddCount: products.cartAddCount,
          imageUrl: products.imageUrl,
          ingredients: products.ingredients,
          launchAt: products.launchAt,
          allergens: products.allergens,
          storageInfo: products.storageInfo,
          shelfLife: products.shelfLife,
          pickupNote: products.pickupNote,
          sortOrder: products.sortOrder,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        },
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
      isComingSoon: Boolean(row.product.launchAt && row.product.launchAt.getTime() > Date.now()),
    };
  } catch {
    return null;
  }
}

export async function getAllProductsForAdmin(q?: string): Promise<AdminProductListItem[]> {
  const conditions: SQL[] = [];
  const keyword = q?.trim();
  if (keyword) {
    const pattern = `%${keyword}%`;
    const search = or(ilike(products.name, pattern), ilike(products.summary, pattern), ilike(products.description, pattern));
    if (search) conditions.push(search);
  }
  const query = db
    .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));
  const rows = conditions.length
    ? await query.where(and(...conditions)).orderBy(desc(products.createdAt), desc(products.id))
    : await query.orderBy(desc(products.createdAt), desc(products.id));
  const now = Date.now();
  return rows.map(({ product, categoryName, categorySlug }) => ({
    ...product,
    categoryName,
    categorySlug,
    isComingSoon: Boolean(product.launchAt && product.launchAt.getTime() > now),
  }));
}
