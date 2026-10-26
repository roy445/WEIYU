"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "./store-provider";

export function FavoriteButton({ productId, slug, compact = false, initialFavorited = false, returnTo }: { productId: number; slug: string; compact?: boolean; initialFavorited?: boolean; returnTo?: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const [pending, setPending] = useState(false);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [justFavorited, setJustFavorited] = useState(false);

  useEffect(() => {
    if (!justFavorited) return;
    const timer = window.setTimeout(() => setJustFavorited(false), 520);
    return () => window.clearTimeout(timer);
  }, [justFavorited]);

  useEffect(() => {
    if (compact || initialFavorited) return;
    let active = true;
    void fetch(`/api/account/favorites?productId=${productId}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { isFavorite?: boolean };
      })
      .then((data) => {
        if (active && typeof data?.isFavorite === "boolean") setFavorited(data.isFavorite);
      })
      .catch(() => {
        // Favorite state lookup is optional; saving remains available.
      });
    return () => {
      active = false;
    };
  }, [compact, initialFavorited, productId]);

  const toggle = async () => {
    setPending(true);
    try {
      const response = favorited
        ? await fetch(`/api/account/favorites?productId=${productId}`, { method: "DELETE" })
        : await fetch("/api/account/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(returnTo ?? `/products/${slug}`)}`);
        return;
      }
      if (!response.ok || !data.ok) {
        toast(data.error ?? "無法加入收藏，請稍後再試。", "error");
        return;
      }
      const nextFavorited = !favorited;
      setFavorited(nextFavorited);
      setJustFavorited(nextFavorited);
      toast(nextFavorited ? "已加入收藏清單。" : "已從收藏清單移除。");
      if (initialFavorited && !nextFavorited) router.refresh();
    } catch {
      toast("網路或伺服器發生問題，請稍後再試。", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-label={favorited ? "從收藏清單移除" : "加入收藏清單"}
      aria-pressed={favorited}
      title={favorited ? "從收藏清單移除" : "加入收藏清單"}
      className={`${compact
        ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-mist bg-cream transition-colors hover:border-caramel disabled:opacity-50"
        : "btn btn-secondary"} ${favorited ? "text-rose-600" : "text-caramel-deep"}`}
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${justFavorited ? "favorite-heart-pop" : ""}`} fill="none" aria-hidden="true">
        <path d="M20.8 8.9c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill={favorited ? "currentColor" : "none"} />
      </svg>
      {!compact ? favorited ? "已收藏" : "加入收藏" : null}
    </button>
  );
}
