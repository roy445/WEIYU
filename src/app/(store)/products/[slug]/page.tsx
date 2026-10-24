import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductLaunchReminder } from "@/components/product-launch-reminder";
import { ProductViewTracker } from "@/components/product-view-tracker";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { ShareButton } from "@/components/share-button";
import { ProductTrackingButton } from "@/components/product-tracking-button";
import { Reveal } from "@/components/reveal";
import { getProductBySlug } from "@/lib/products";
import { formatLaunchDate } from "@/lib/brand";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProductBySlug(slug);
  if (!detail) return { title: "找不到商品" };
  return {
    title: detail.product.name,
    description: detail.product.summary || `${detail.product.name} — 唯遇甜所手作甜點`,
    openGraph: {
      title: `${detail.product.name}｜WEIYU 唯遇甜所`,
      description: detail.product.summary,
      images: detail.product.imageUrl ? [{ url: detail.product.imageUrl, alt: `${detail.product.name} 示意圖片` }] : undefined,
    },
  };
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-mist/60 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs tracking-[0.18em] text-caramel-deep">{label}</dt>
      <dd className={`text-sm leading-relaxed ${value ? "text-cocoa" : "text-cocoa-soft"}`}>
        {value || "待補充"}
      </dd>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getProductBySlug(slug);
  if (!detail) notFound();

  const { product, variants, categoryName, categorySlug, isComingSoon } = detail;
  const comingSoon = isComingSoon;

  return (
    <div className="container-wy py-10 md:py-16">
      <ProductViewTracker productId={product.id} />
      <nav aria-label="路徑" className="text-xs tracking-[0.1em] text-cocoa-soft">
        <Link href="/products" className="hover:text-caramel-deep">
          全部甜點
        </Link>
        {categoryName ? (
          <>
            <span className="mx-2">/</span>
            <Link href={`/products?category=${categorySlug}`} className="hover:text-caramel-deep">
              {categoryName}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-cocoa">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <ProductImageGallery
          images={product.galleryImages.length > 0 ? product.galleryImages : product.imageUrl ? [product.imageUrl] : []}
          alt={product.name}
          badge={
            comingSoon ? "即將上架" : !product.isActive ? "暫停販售" : product.stock <= 0 ? "缺貨中" : null
          }
          badgeTone={comingSoon ? "caramel" : "cocoa"}
        />

        <div>
          <div className="animate-rise" style={{ animationDelay: "120ms" }}>
            {categoryName ? <p className="eyebrow">{categoryName}</p> : null}
            <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
            {product.summary ? <p className="mt-4 text-base leading-relaxed text-cocoa-soft">{product.summary}</p> : null}
          </div>

          <div className="mt-8 animate-rise" style={{ animationDelay: "240ms" }}>
            <div className="mb-4 flex justify-end">
              <div className="flex gap-2">
                <ShareButton title={product.name} path={`/products/${product.slug}`} />
                <FavoriteButton productId={product.id} slug={product.slug} />
              </div>
            </div>
            {!comingSoon && product.isActive ? <ProductTrackingButton productId={product.id} slug={product.slug} /> : null}
            {comingSoon && product.launchAt ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-caramel/25 bg-oat-soft/50 px-4 py-3 text-sm text-cocoa">
                  預計 {formatLaunchDate(product.launchAt)} 上架，現在尚未開放購買。
                </p>
                <ProductLaunchReminder slug={product.slug} />
              </div>
            ) : (
              <ProductPurchase
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  stock: product.stock,
                  isActive: product.isActive,
                  imageUrl: product.imageUrl,
                }}
                variants={variants.map((variant) => ({
                  id: variant.id,
                  name: variant.name,
                  priceDelta: variant.priceDelta,
                  stock: variant.stock,
                }))}
              />
            )}
          </div>

          {product.description ? (
            <Reveal className="mt-10">
              <h2 className="text-xl">關於這款甜點</h2>
              <div className="mt-3 space-y-3 text-sm leading-[1.9] text-cocoa-soft">
                {product.description.split("\n").filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </Reveal>
          ) : null}

          <Reveal className="mt-10">
            <h2 className="text-xl">商品資訊</h2>
            <dl className="mt-2">
              <InfoRow label="成分" value={product.ingredients} />
              <InfoRow label="過敏原" value={product.allergens} />
              <InfoRow label="保存方式" value={product.storageInfo} />
              <InfoRow label="賞味期限" value={product.shelfLife} />
              <InfoRow label="取貨說明" value={product.pickupNote ?? "面交取貨，取貨時付款。"} />
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-cocoa-soft">
              以上資訊由我親自填寫；顯示「待補充」表示還沒確認，下單前有疑問歡迎先問我。
            </p>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
