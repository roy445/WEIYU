"use client";

import Link from "next/link";
import { formatLaunchDate, formatPrice } from "@/lib/brand";
import { recordProductMetric } from "@/lib/product-metrics";
import { SafeImage } from "./safe-image";
import { FavoriteButton } from "./favorite-button";
import { useStore } from "./store-provider";

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl: string | null;
  categoryName: string | null;
  launchAt: Date | null;
  isComingSoon: boolean;
};

export function ProductCard({ product, index = 0 }: { product: ProductCardData; index?: number }) {
  const { addLine, toast, openCart } = useStore();
  const soldOut = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const comingSoon = product.isComingSoon;

  const handleAdd = () => {
    if (soldOut || !product.isActive) {
      toast("這項甜點目前缺貨，歡迎先看看其他品項。", "error");
      return;
    }
    const result = addLine({
      productId: product.id,
      variantId: null,
      slug: product.slug,
      name: product.name,
      variantName: null,
      unitPrice: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      maxQuantity: product.stock,
    });
    toast(result.message, result.added ? "success" : "info");
    if (result.added) {
      recordProductMetric(product.id, "cart_add");
      openCart();
    }
  };

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-mist/60 bg-[#fffdf8] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-caramel/40 hover:shadow-[0_22px_45px_-38px_rgba(84,59,43,0.8)]"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-oat-soft sm:aspect-[4/3]"
        aria-label={`查看 ${product.name} 商品詳情`}
      >
        <SafeImage
          src={product.imageUrl}
          alt={`${product.name} 甜點示意圖片`}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute left-3 top-3 flex gap-2">
          {comingSoon ? (
            <span className="badge bg-caramel text-cream">即將上架</span>
          ) : !product.isActive ? (
            <span className="badge bg-cocoa/85 text-cream">暫停販售</span>
          ) : soldOut ? (
            <span className="badge bg-cocoa/85 text-cream">缺貨中</span>
          ) : lowStock ? (
            <span className="badge bg-cream/95 text-caramel-deep">僅剩 {product.stock} 份</span>
          ) : null}
        </span>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton productId={product.id} slug={product.slug} compact />
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {product.categoryName ? (
              <p className="text-[0.68rem] tracking-[0.18em] text-caramel-deep">{product.categoryName}</p>
            ) : null}
            <h3 className="mt-1.5 text-base leading-snug sm:text-lg">
              <Link href={`/products/${product.slug}`} className="hover:text-caramel-deep">
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="shrink-0 font-serif text-sm text-cocoa sm:text-lg">
            {comingSoon ? `預計 ${formatLaunchDate(product.launchAt!)}` : product.price > 0 ? formatPrice(product.price) : "價格待確認"}
          </p>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cocoa-soft sm:text-sm">{product.summary}</p>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={handleAdd}
            disabled={comingSoon || soldOut || !product.isActive}
            className="btn btn-secondary btn-sm min-w-0 flex-1 px-2 text-[0.68rem] sm:px-3 sm:text-xs"
            aria-label={`將 ${product.name} 加入購物袋`}
          >
            {comingSoon ? "即將上架" : !product.isActive ? "暫停販售" : product.price <= 0 ? "資訊待確認" : soldOut ? "補貨中" : "加入購物袋"}
          </button>
          <Link
            href={`/products/${product.slug}`}
            className="btn btn-sm shrink-0 border-transparent px-1.5 text-[0.68rem] text-cocoa-soft hover:text-caramel-deep sm:px-3 sm:text-xs"
            aria-label={`${product.name} 詳細資訊`}
          >
            詳情
          </Link>
        </div>
      </div>
    </article>
  );
}
