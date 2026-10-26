import "server-only";

import { and, asc, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, productVariants, products, type Product, type ProductVariant } from "@/db/schema";
import {
  calculateSixCookieAvailability,
  COOKIE_FLAVOR_SLUGS,
  getSixCookieVariantAvailability,
  SIX_COOKIE_PACK_SLUG,
  type CookieFlavorStocks,
} from "@/lib/cookie-packs";

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

export async function getCookieFlavorInventory() {
  const rows = await db.select({ slug: products.slug, stock: products.stock, isActive: products.isActive })
    .from(products)
    .where(inArray(products.slug, Object.values(COOKIE_FLAVOR_SLUGS)));
  const bySlug = new Map(rows.map((row) => [row.slug, row.isActive ? row.stock : 0]));
  const stocks: CookieFlavorStocks = {
    original: bySlug.get(COOKIE_FLAVOR_SLUGS.original) ?? 0,
    chocolate: bySlug.get(COOKIE_FLAVOR_SLUGS.chocolate) ?? 0,
    matcha: bySlug.get(COOKIE_FLAVOR_SLUGS.matcha) ?? 0,
  };
  return { stocks, availability: calculateSixCookieAvailability(stocks) };
}

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
        galleryImages: products.galleryImages,
        ingredients: products.ingredients,
        launchAt: products.launchAt,
        allergens: products.allergens,
        storageInfo: products.storageInfo,
        requiresRefrigeration: products.requiresRefrigeration,
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
    const cookieInventory = rows.some((row) => row.slug === SIX_COOKIE_PACK_SLUG)
      ? await getCookieFlavorInventory()
      : null;
    const now = Date.now();
    return rows.map((row) => ({
      ...row,
      stock: row.slug === SIX_COOKIE_PACK_SLUG && cookieInventory
        ? cookieInventory.availability.maxAvailable
        : row.stock,
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
          galleryImages: products.galleryImages,
          ingredients: products.ingredients,
          launchAt: products.launchAt,
          allergens: products.allergens,
          storageInfo: products.storageInfo,
          requiresRefrigeration: products.requiresRefrigeration,
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
    const cookieInventory = row.product.slug === SIX_COOKIE_PACK_SLUG ? await getCookieFlavorInventory() : null;
    return {
      product: cookieInventory
        ? { ...row.product, stock: cookieInventory.availability.maxAvailable }
        : row.product,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      variants: variants.filter((variant) => variant.isActive).map((variant) =>
        cookieInventory
          ? { ...variant, stock: getSixCookieVariantAvailability(variant.name, cookieInventory.availability) }
          : variant,
      ),
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
  const cookieInventory = rows.some(({ product }) => product.slug === SIX_COOKIE_PACK_SLUG)
    ? await getCookieFlavorInventory()
    : null;
  return rows.map(({ product, categoryName, categorySlug }) => ({
    ...product,
    stock: product.slug === SIX_COOKIE_PACK_SLUG && cookieInventory
      ? cookieInventory.availability.maxAvailable
      : product.stock,
    categoryName,
    categorySlug,
    isComingSoon: Boolean(product.launchAt && product.launchAt.getTime() > now),
  }));
}
