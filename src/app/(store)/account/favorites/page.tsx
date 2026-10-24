import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { favoriteProducts, products } from "@/db/schema";
import { SafeImage } from "@/components/safe-image";
import { FavoriteButton } from "@/components/favorite-button";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/brand";

export const metadata: Metadata = { title: "我的收藏" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/favorites");

  const favorites = await db
    .select({
      product: {
        id: products.id,
        slug: products.slug,
        name: products.name,
        price: products.price,
        summary: products.summary,
        imageUrl: products.imageUrl,
      },
    })
    .from(favoriteProducts)
    .innerJoin(products, eq(favoriteProducts.productId, products.id))
    .where(eq(favoriteProducts.userId, user.id))
    .orderBy(desc(favoriteProducts.createdAt));

  return (
    <div className="container-wy py-12 md:py-16">
      <Link href="/account" className="text-sm text-caramel-deep underline underline-offset-4">← 回會員中心</Link>
      <p className="eyebrow mt-6">Your saved treats</p>
      <h1 className="mt-3 text-4xl">我的收藏</h1>
      <p className="mt-2 text-sm text-cocoa-soft">喜歡的甜點都收在這裡，登入後可在不同裝置查看。</p>

      {favorites.length === 0 ? (
        <div className="surface mt-8 rounded-xl px-6 py-14 text-center">
          <p className="font-serif text-2xl">還沒有收藏甜點</p>
          <p className="mt-2 text-sm text-cocoa-soft">在商品卡片或商品介紹頁點選愛心，加入喜歡的品項。</p>
          <Link href="/products" className="btn btn-primary mt-6">去逛逛甜點</Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map(({ product }) => (
            <li key={product.id} className="surface overflow-hidden rounded-xl">
              <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] bg-oat-soft">
                <SafeImage src={product.imageUrl} alt={product.name} sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/products/${product.slug}`} className="font-medium hover:text-caramel-deep">{product.name}</Link>
                  <span className="shrink-0 font-serif text-lg">{product.price > 0 ? formatPrice(product.price) : "價格待確認"}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-cocoa-soft">{product.summary}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/products/${product.slug}`} className="btn btn-secondary btn-sm">查看商品</Link>
                  <FavoriteButton productId={product.id} slug={product.slug} initialFavorited />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
