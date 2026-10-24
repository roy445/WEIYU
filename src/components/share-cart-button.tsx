"use client";

import { useState } from "react";
import { useStore } from "./store-provider";

export function ShareCartButton() {
  const { lines, isReady, toast } = useStore();
  const [pending, setPending] = useState(false);

  const createShareLink = async () => {
    if (!isReady || lines.length === 0) {
      toast("購物袋目前沒有可分享的商品。", "info");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/cart/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })),
        }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; token?: string };
      if (!response.ok || !data.ok || !data.token) {
        toast(data.error ?? "建立購物袋分享連結失敗。", "error");
        return;
      }
      const url = new URL(`/share/cart/${data.token}`, window.location.origin).toString();
      if (navigator.share) {
        await navigator.share({ title: "唯遇甜所購物袋分享", url });
        toast("購物袋分享連結已建立，有效期限為 7 天。");
      } else {
        await navigator.clipboard.writeText(url);
        toast("購物袋分享連結已複製，有效期限為 7 天。");
      }
    } catch {
      toast("分享連結建立或複製失敗，請稍後再試。", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" onClick={() => void createShareLink()} disabled={pending || !isReady || lines.length === 0} className="mt-2 w-full py-2 text-center text-xs text-caramel-deep underline underline-offset-4 disabled:opacity-50">
      {pending ? "建立分享連結中…" : "分享購物袋（7 天有效）"}
    </button>
  );
}
