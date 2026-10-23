"use client";

import { useStore } from "./store-provider";
import { recordProductMetric } from "@/lib/product-metrics";

type Props = {
  product: { id: number; slug: string; name: string; price: number; stock: number; isActive: boolean; imageUrl: string | null };
  className?: string;
};

export function AddToBagButton({ product, className = "btn btn-primary" }: Props) {
  const { addLine, toast, openCart } = useStore();
  const soldOut = product.stock <= 0 || !product.isActive;

  const onClick = () => {
    if (soldOut) {
      toast("這款甜點目前缺貨，歡迎先看看其他品項。", "error");
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
    <button type="button" onClick={onClick} disabled={soldOut} className={className} aria-label={`將 ${product.name} 加入購物袋`}>
      {!product.isActive ? "暫停販售" : soldOut ? "目前缺貨" : "加入購物袋"}
    </button>
  );
}
