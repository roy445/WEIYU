"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime, formatPrice } from "@/lib/brand";
import { useStore } from "./store-provider";

type SharedItem = {
  productId: number;
  variantId: number | null;
  slug: string;
  name: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  imageUrl: string | null;
};

export function SharedCartPage({ token }: { token: string }) {
  const { addLine, toast, openCart } = useStore();
  const [items, setItems] = useState<SharedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/cart/share?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json() as { ok?: boolean; error?: string; items?: SharedItem[]; expiresAt?: string };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "無法讀取分享購物袋。");
        if (active) {
          setItems(data.items ?? []);
          setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "無法讀取分享購物袋。");
      });
    return () => { active = false; };
  }, [token]);

  const addSharedItems = () => {
    if (!items.length) return;
    for (const item of items) {
      addLine({
        productId: item.productId,
        variantId: item.variantId,
        slug: item.slug,
        name: item.name,
        variantName: item.variantName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        maxQuantity: Math.max(1, item.maxQuantity),
      });
    }
    toast("分享的商品已加入你的購物袋；結帳時仍會重新確認價格與庫存。");
    openCart();
  };

  return (
    <div className="container-wy py-14 md:py-20">
      <p className="eyebrow">Shared bag</p>
      <h1 className="mt-3 text-4xl">朋友分享的購物袋</h1>
      {expiresAt ? <p className="mt-2 text-xs text-cocoa-soft">連結有效至 {formatDateTime(expiresAt)}</p> : null}
      {error ? <p role="alert" className="surface mt-8 rounded-lg p-5 text-sm">{error}</p> : null}
      {!error && items.length === 0 ? <p className="surface mt-8 rounded-lg p-5 text-sm">連結內沒有目前可購買的商品。</p> : null}
      {items.length ? (
        <>
          <ul className="mt-8 space-y-3">
            {items.map((item, index) => (
              <li key={`${item.productId}-${item.variantId}-${index}`} className="surface flex items-center justify-between gap-4 rounded-lg p-4">
                <div>
                  <Link href={`/products/${item.slug}`} className="font-medium text-caramel-deep hover:underline">{item.name}</Link>
                  {item.variantName ? <p className="mt-1 text-xs text-cocoa-soft">規格：{item.variantName}</p> : null}
                  <p className="mt-1 text-xs text-cocoa-soft">{formatPrice(item.unitPrice)} × {item.quantity}</p>
                </div>
                <p className="font-serif">{formatPrice(item.unitPrice * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-cocoa-soft">分享內容不會保留分享者資料；目前價格和庫存以商品頁及結帳時重新確認結果為準。</p>
          <button type="button" onClick={addSharedItems} className="btn btn-primary mt-6">加入我的購物袋</button>
        </>
      ) : null}
    </div>
  );
}
