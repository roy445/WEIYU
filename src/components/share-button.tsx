"use client";

import { useStore } from "./store-provider";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const { toast } = useStore();

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("商品分享連結已複製。");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("無法分享連結，請檢查瀏覽器的剪貼簿權限。", "error");
    }
  };

  return <button type="button" onClick={() => void share()} className="btn btn-secondary btn-sm">分享商品</button>;
}
