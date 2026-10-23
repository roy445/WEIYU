"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/brand";
import { SafeImage } from "./safe-image";
import { useStore } from "./store-provider";

export function CartDrawer() {
  const { lines, count, subtotal, cartOpen, closeCart, setQuantity, removeLine, isReady, syncPrices } =
    useStore();
  const [rendered, setRendered] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 開啟時立即掛載（在 render 期間調整衍生狀態），關閉時延遲卸載以播放滑出動畫
  if (cartOpen && !rendered) setRendered(true);

  useEffect(() => {
    if (cartOpen) {
      void syncPrices();
      const timer = window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
      }, 120);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setRendered(false), 320);
    return () => window.clearTimeout(timer);
  }, [cartOpen, syncPrices]);

  useEffect(() => {
    if (!cartOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [cartOpen, closeCart]);

  if (!rendered && !cartOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="購物袋">
      <button
        type="button"
        aria-label="關閉購物袋"
        onClick={closeCart}
        className={`absolute inset-0 cursor-default bg-cocoa/30 transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "opacity-0"
        }`}
        tabIndex={cartOpen ? 0 : -1}
      />
      <div
        ref={panelRef}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col bg-cream shadow-[-24px_0_60px_-40px_rgba(84,59,43,0.7)] transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-mist px-5 py-4">
          <div>
            <p className="eyebrow">Your bag</p>
            <h2 className="mt-1 text-lg">購物袋 {isReady ? `（${count}）` : ""}</h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full border border-mist p-2 text-cocoa transition-colors hover:border-caramel hover:text-caramel-deep"
            aria-label="關閉購物袋"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="font-serif text-xl text-cocoa">購物袋還是空的</p>
            <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">
              挑一份適合今天的甜點，
              <br />
              為日常留下一點甜。
            </p>
            <Link href="/products" onClick={closeCart} className="btn btn-primary mt-6">
              探索甜點
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-3 border-b border-mist/60 pb-4 last:border-0">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={closeCart}
                    className="relative aspect-square w-20 shrink-0 overflow-hidden rounded bg-oat-soft"
                  >
                    <SafeImage src={line.imageUrl} alt={`${line.name} 商品圖片`} className="object-cover" sizes="80px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${line.slug}`}
                        onClick={closeCart}
                        className="text-sm font-medium leading-snug text-cocoa hover:text-caramel-deep"
                      >
                        {line.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          removeLine(line.key);
                        }}
                        className="shrink-0 text-[0.7rem] text-cocoa-soft underline decoration-mist underline-offset-2 transition-colors hover:text-caramel-deep"
                        aria-label={`移除 ${line.name}`}
                      >
                        移除
                      </button>
                    </div>
                    {line.variantName ? (
                      <p className="mt-0.5 text-xs text-cocoa-soft">規格：{line.variantName}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-cocoa-soft">{formatPrice(line.unitPrice)} / 份</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-mist">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-cocoa transition-colors hover:text-caramel-deep disabled:opacity-40"
                          onClick={() => setQuantity(line.key, line.quantity - 1)}
                          disabled={line.quantity <= 1}
                          aria-label={`減少 ${line.name} 數量`}
                        >
                          −
                        </button>
                        <span className="min-w-7 text-center text-sm" aria-live="polite">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-cocoa transition-colors hover:text-caramel-deep disabled:opacity-40"
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                          disabled={line.quantity >= line.maxQuantity}
                          aria-label={`增加 ${line.name} 數量`}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm text-cocoa">{formatPrice(line.unitPrice * line.quantity)}</p>
                    </div>
                    {line.quantity >= line.maxQuantity ? (
                      <p className="mt-1 text-[0.7rem] text-caramel-deep">已達目前可售數量上限</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-mist bg-cream-deep/60 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cocoa-soft">小計</span>
                <span className="font-serif text-xl text-cocoa">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-cocoa-soft">
                僅提供面交取貨，於取貨時付款。運費與線上付款均不適用。
              </p>
              <Link href="/checkout" onClick={closeCart} className="btn btn-primary mt-3 w-full">
                前往結帳
              </Link>
              <button
                type="button"
                onClick={closeCart}
                className="mt-2 w-full py-2 text-center text-xs tracking-[0.1em] text-cocoa-soft transition-colors hover:text-caramel-deep"
              >
                繼續瀏覽甜點
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
