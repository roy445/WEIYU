"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/brand";
import { recordProductMetric } from "@/lib/product-metrics";
import { SIX_COOKIE_CUSTOM_VARIANT, SIX_COOKIE_PACK_SLUG } from "@/lib/cookie-packs";
import { useStore } from "./store-provider";

type Variant = { id: number; name: string; priceDelta: number; stock: number };

type Props = {
  product: {
    id: number;
    slug: string;
    name: string;
    price: number;
    stock: number;
    isActive: boolean;
    imageUrl: string | null;
  };
  variants: Variant[];
};

export function ProductPurchase({ product, variants }: Props) {
  const { addLine, toast, openCart } = useStore();
  const [variantId, setVariantId] = useState<number | null>(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const variant = useMemo(() => variants.find((item) => item.id === variantId) ?? null, [variants, variantId]);
  const unitPrice = product.price + (variant?.priceDelta ?? 0);
  const available = Math.max(0, variant ? Math.min(product.stock, variant.stock) : product.stock);
  const pricePending = product.price <= 0;
  const soldOut = available <= 0 || !product.isActive || pricePending;

  const handleAdd = () => {
    if (soldOut) {
      toast("這個品項目前無法加入購物袋。", "error");
      return;
    }
    const result = addLine({
      productId: product.id,
      variantId: variant?.id ?? null,
      slug: product.slug,
      name: product.name,
      variantName: variant?.name ?? null,
      unitPrice,
      quantity,
      imageUrl: product.imageUrl,
      maxQuantity: available,
    });
    toast(result.message, result.added ? "success" : "info");
    if (result.added) {
      recordProductMetric(product.id, "cart_add");
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1600);
      openCart();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <p className="font-serif text-3xl text-cocoa">{pricePending ? "價格待確認" : formatPrice(unitPrice)}</p>
        {!pricePending && variant && variant.priceDelta !== 0 ? (
          <p className="text-xs text-cocoa-soft">（含規格差額 {variant.priceDelta > 0 ? "+" : ""}{variant.priceDelta}）</p>
        ) : null}
      </div>

      {variants.length > 0 ? (
        <fieldset>
          <legend className="field-label">規格</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((item) => {
              const active = item.id === variantId;
              const itemAvailable = Math.min(product.stock, item.stock) > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setVariantId(item.id);
                    setQuantity(1);
                  }}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    active
                      ? "border-caramel bg-caramel text-cream"
                      : "border-mist text-cocoa hover:border-caramel hover:text-caramel-deep"
                  } ${!itemAvailable ? "opacity-60" : ""}`}
                >
                  {item.name}
                  {!itemAvailable ? "（缺貨）" : ""}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {product.slug === SIX_COOKIE_PACK_SLUG && variant?.name === SIX_COOKIE_CUSTOM_VARIANT ? (
        <p className="rounded-lg border border-caramel/30 bg-oat-soft/40 px-4 py-3 text-xs leading-relaxed text-cocoa">
          請在結帳「訂單備註」填寫每袋配比，例如「原味 2、巧克力 1、抹茶 3」。每種至少 1 顆、合計 6 顆；未填或數量不符將無法成立訂單。若買多袋，此配比會套用到每一袋。
        </p>
      ) : null}

      <div>
        <p className="field-label">數量</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center rounded-full border border-mist">
            <button
              type="button"
              className="px-4 py-2 text-lg text-cocoa transition-colors hover:text-caramel-deep disabled:opacity-40"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1 || soldOut}
              aria-label="減少數量"
            >
              −
            </button>
            <span className="min-w-10 text-center text-base" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              className="px-4 py-2 text-lg text-cocoa transition-colors hover:text-caramel-deep disabled:opacity-40"
              onClick={() => setQuantity((value) => Math.min(available, value + 1))}
              disabled={quantity >= available || soldOut}
              aria-label="增加數量"
            >
              +
            </button>
          </div>
          <p className="text-xs text-cocoa-soft">
            {!product.isActive
              ? "此品項目前暫停販售"
              : pricePending
                ? "店家尚未確認售價，目前無法訂購"
              : available <= 0
                ? "目前缺貨，補貨後會重新開放"
                : available <= 5
                  ? `僅剩 ${available} 份`
                  : `可售 ${available} 份`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className={`btn flex-1 ${justAdded ? "btn-dark" : "btn-primary"}`}
        >
          {pricePending ? "價格確認後開放購買" : soldOut ? "目前無法購買" : justAdded ? "已加入購物袋 ✓" : `加入購物袋 · ${formatPrice(unitPrice * quantity)}`}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-cocoa-soft">
        價格與庫存以結帳時伺服器重新驗證為準。僅提供面交取貨、取貨時付款。
      </p>
    </div>
  );
}
