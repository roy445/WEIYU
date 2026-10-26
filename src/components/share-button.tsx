"use client";

import { useRef } from "react";
import { useStore } from "./store-provider";
import {
  getProductShareMessage,
  getProductShareVariant,
  PRODUCT_SHARE_COPY_COUNT,
} from "@/lib/product-share";

function createShareSeed(): string {
  if (window.crypto?.getRandomValues) {
    const values = window.crypto.getRandomValues(new Uint32Array(2));
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function ShareButton({ title, path }: { title: string; path: string }) {
  const { toast } = useStore();
  const lastVariant = useRef<number | null>(null);

  const share = async () => {
    const variantKey = `weiyu:share-variant:${path}`;
    let previousVariant = lastVariant.current;
    if (previousVariant === null) {
      try {
        const savedVariant = Number(window.sessionStorage.getItem(variantKey));
        if (Number.isInteger(savedVariant) && savedVariant >= 0 && savedVariant < PRODUCT_SHARE_COPY_COUNT) {
          previousVariant = savedVariant;
        }
      } catch {
        // Storage may be unavailable in private browsing; the in-memory ref still avoids repeats.
      }
    }

    let seed = createShareSeed();
    let variant = getProductShareVariant(seed);
    for (let attempt = 0; variant === previousVariant && attempt < PRODUCT_SHARE_COPY_COUNT * 2; attempt += 1) {
      seed = createShareSeed();
      variant = getProductShareVariant(seed);
    }
    lastVariant.current = variant;
    try {
      window.sessionStorage.setItem(variantKey, String(variant));
    } catch {
      // Sharing still works if session storage is unavailable.
    }

    const message = getProductShareMessage(title, seed);
    const url = new URL(path, window.location.origin);
    url.searchParams.set("share", seed);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: message, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(`${message}\n${url.toString()}`);
        toast("分享文案與商品連結已複製。");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("無法分享連結，請檢查瀏覽器的剪貼簿權限。", "error");
    }
  };

  return <button type="button" onClick={() => void share()} className="btn btn-secondary btn-sm">分享商品</button>;
}
