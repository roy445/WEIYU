"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  key: string;
  productId: number;
  variantId: number | null;
  slug: string;
  name: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  maxQuantity: number;
};

export type NewCartLine = Omit<CartLine, "key">;

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

type StoreContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isReady: boolean;
  cartOpen: boolean;
  addLine: (line: NewCartLine) => { added: boolean; message: string };
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toast: (message: string, tone?: ToastTone) => void;
  syncPrices: () => Promise<void>;
};

const STORAGE_KEY = "weiyu_cart_v1";
const StoreContext = createContext<StoreContextValue | null>(null);

function makeKey(productId: number, variantId: number | null): string {
  return `${productId}:${variantId ?? "base"}`;
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.key === "string" &&
    typeof line.productId === "number" &&
    typeof line.name === "string" &&
    typeof line.quantity === "number" &&
    typeof line.unitPrice === "number"
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  useEffect(() => {
    // 在 hydration 完成後才讀取 localStorage，避免 SSR 與客戶端畫面不一致
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setLines(parsed.filter(isCartLine));
          }
        }
      } catch {
        // 忽略損壞的本機購物袋資料
      }
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // localStorage 可能不可用，購物流程仍可透過伺服器完成
    }
  }, [lines, isReady]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = toastId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const addLine = useCallback<StoreContextValue["addLine"]>(
    (input) => {
      const key = makeKey(input.productId, input.variantId ?? null);
      const quantity = Math.max(1, Math.trunc(input.quantity));
      const limit = Math.max(1, input.maxQuantity);
      let message = "已加入購物袋。";
      let added = true;

      setLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          const nextQuantity = existing.quantity + quantity;
          if (nextQuantity > limit) {
            added = false;
            message = `「${input.name}」最多可購買 ${limit} 份。`;
            return current.map((line) =>
              line.key === key ? { ...line, quantity: limit, maxQuantity: limit } : line,
            );
          }
          return current.map((line) =>
            line.key === key
              ? {
                  ...line,
                  quantity: nextQuantity,
                  unitPrice: input.unitPrice,
                  maxQuantity: limit,
                }
              : line,
          );
        }
        if (quantity > limit) {
          added = false;
          message = `「${input.name}」目前庫存僅剩 ${limit} 份。`;
          return [...current, { ...input, key, quantity: limit }];
        }
        return [...current, { ...input, key, quantity }];
      });
      return { added, message };
    },
    [],
  );

  const setQuantity = useCallback<StoreContextValue["setQuantity"]>((key, quantity) => {
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              quantity: Math.min(Math.max(1, Math.trunc(quantity)), Math.max(1, line.maxQuantity)),
            }
          : line,
      ),
    );
  }, []);

  const removeLine = useCallback<StoreContextValue["removeLine"]>((key) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const syncPrices = useCallback(async () => {
    if (!isReady) return;
    try {
      const currentLines = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      const payload = Array.isArray(currentLines)
        ? currentLines
            .filter(isCartLine)
            .map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
            }))
        : [];
      if (payload.length === 0) return;
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        lines?: {
          productId: number;
          variantId: number | null;
          name: string;
          variantName: string | null;
          slug: string;
          imageUrl: string | null;
          unitPrice: number;
          quantity: number;
          maxQuantity: number;
        }[];
        issues?: string[];
      };
      if (!response.ok || !data.ok || !Array.isArray(data.lines)) return;
      setLines(
        data.lines.map((line) => ({
          key: makeKey(line.productId, line.variantId),
          productId: line.productId,
          variantId: line.variantId,
          slug: line.slug,
          name: line.name,
          variantName: line.variantName,
          imageUrl: line.imageUrl,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          maxQuantity: Math.max(1, line.maxQuantity),
        })),
      );
      if (data.issues && data.issues.length > 0) {
        toast(data.issues[0], "info");
      }
    } catch {
      // 離線時保留本機購物袋，結帳時仍由伺服器重新驗證
    }
  }, [isReady, toast]);

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      lines,
      count,
      subtotal,
      isReady,
      cartOpen,
      addLine,
      setQuantity,
      removeLine,
      clearCart,
      openCart,
      closeCart,
      toast,
      syncPrices,
    }),
    [
      lines,
      count,
      subtotal,
      isReady,
      cartOpen,
      addLine,
      setQuantity,
      removeLine,
      clearCart,
      openCart,
      closeCart,
      toast,
      syncPrices,
    ],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-sm shadow-[0_10px_30px_-18px_rgba(84,59,43,0.55)] animate-rise ${
              item.tone === "error"
                ? "border-[#D9B8AE] bg-[#FBF1EE] text-[#7C4234]"
                : item.tone === "info"
                  ? "border-mist bg-cream text-cocoa"
                  : "border-[#C9D6C6] bg-[#F2F7F0] text-[#3F5B41]"
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used inside StoreProvider");
  }
  return context;
}
