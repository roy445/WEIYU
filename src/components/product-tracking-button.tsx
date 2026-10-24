"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store-provider";

type TrackingState = { isTracking: boolean; emailEnabled: boolean };

export function ProductTrackingButton({ productId, slug }: { productId: number; slug: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const [state, setState] = useState<TrackingState>({ isTracking: false, emailEnabled: false });
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/account/product-tracking?productId=${productId}`)
      .then(async (response) => {
        if (response.status === 401) return null;
        const data = await response.json() as { ok?: boolean; isTracking?: boolean; emailEnabled?: boolean };
        return response.ok && data.ok ? { isTracking: Boolean(data.isTracking), emailEnabled: Boolean(data.emailEnabled) } : null;
      })
      .then((data) => {
        if (active && data) setState(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  const save = async (emailEnabled: boolean) => {
    setPending(true);
    try {
      const response = await fetch("/api/account/product-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, emailEnabled }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; isTracking?: boolean; emailEnabled?: boolean };
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
        return;
      }
      if (!response.ok || !data.ok) {
        toast(data.error ?? "無法更新商品追蹤設定。", "error");
        return;
      }
      setState({ isTracking: Boolean(data.isTracking), emailEnabled: Boolean(data.emailEnabled) });
      toast("商品追蹤通知設定已儲存。");
    } catch {
      toast("網路或伺服器發生問題，請稍後再試。", "error");
    } finally {
      setPending(false);
    }
  };

  const stop = async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/account/product-tracking?productId=${productId}`, { method: "DELETE" });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        toast(data.error ?? "無法關閉商品追蹤。", "error");
        return;
      }
      setState({ isTracking: false, emailEnabled: false });
      toast("已關閉商品追蹤。");
    } catch {
      toast("網路或伺服器發生問題，請稍後再試。", "error");
    } finally {
      setPending(false);
    }
  };

  if (!loaded) return <p className="text-xs text-cocoa-soft">載入商品追蹤設定中…</p>;
  return (
    <div className="mt-4 rounded-lg border border-mist bg-cream/70 p-4">
      <p className="text-sm font-medium text-cocoa">{state.isTracking ? "你正在追蹤此商品" : "商品價格與庫存提醒"}</p>
      <p className="mt-1 text-xs leading-relaxed text-cocoa-soft">開啟後，商品降價、補貨、庫存降至 2 件或售罄時會收到會員中心通知。追蹤由你自行開啟，可隨時關閉。</p>
      <label className="mt-3 flex items-start gap-2 text-xs text-cocoa-soft">
        <input type="checkbox" checked={state.emailEnabled} onChange={(event) => setState((current) => ({ ...current, emailEnabled: event.target.checked }))} disabled={pending} />
        <span>同意同時以 Email 接收上述商品通知。</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => void save(state.emailEnabled)}>
          {state.isTracking ? "儲存通知設定" : "開啟追蹤通知"}
        </button>
        {state.isTracking ? <button className="btn btn-sm text-[#8A4B3D]" type="button" disabled={pending} onClick={() => void stop()}>關閉追蹤</button> : null}
      </div>
    </div>
  );
}
