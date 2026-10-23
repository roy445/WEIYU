"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ShopSettings } from "@/db/schema";
import { LogoLockup } from "@/components/logo";
import { useStore } from "@/components/store-provider";
import { Toggle, apiRequest } from "./dialog";

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const router = useRouter();
  const { toast } = useStore();
  const [form, setForm] = useState({
    shopName: settings.shopName,
    brandNameEn: settings.brandNameEn,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl ?? "",
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    contactSocial: settings.contactSocial ?? "",
    isAcceptingOrders: settings.isAcceptingOrders,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const bind = (key: keyof typeof form) => ({
    value: String(form[key]),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await apiRequest("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "儲存失敗。");
      toast(result.data.error ?? "儲存失敗。", "error");
      return;
    }
    toast("商店設定已儲存。");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <section className="surface rounded-lg p-5">
        <h2 className="text-xl">品牌識別</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="s-name">品牌名稱（中文）</label>
            <input id="s-name" className="field" {...bind("shopName")} />
          </div>
          <div>
            <label className="field-label" htmlFor="s-en">品牌名稱（英文）</label>
            <input id="s-en" className="field" {...bind("brandNameEn")} />
          </div>
          <div>
            <label className="field-label" htmlFor="s-tagline">品牌標語</label>
            <input id="s-tagline" className="field" {...bind("tagline")} />
          </div>
          <div className="sm:col-span-3">
            <label className="field-label" htmlFor="s-logo">完整 LOGO 圖片網址（選填，用於開場動畫、頁面切換與登入頁）</label>
            <input id="s-logo" className="field" placeholder="/brand/weiyu-logo.png" {...bind("logoUrl")} />
            <p className="mt-1 text-xs text-cocoa-soft">
              留空會使用內建依品牌規格重製的 SVG 標誌。若要使用你的 LOGO 原圖，把檔案放到專案 public/brand/ 內（例如 weiyu-logo.png），再填入 /brand/weiyu-logo.png。導覽列固定使用 SVG 標誌以確保縮小後仍清晰。
            </p>
            <div className="mt-3 flex justify-center rounded border border-mist/70 bg-cream px-4 py-8">
              <LogoLockup imageUrl={form.logoUrl || null} />
            </div>
          </div>
        </div>
      </section>

      <section className="surface rounded-lg p-5">
        <h2 className="text-xl">聯絡方式</h2>
        <p className="mt-1 text-xs text-cocoa-soft">未填寫的項目不會顯示在前台，也不會以假資料代替。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="s-email">聯絡 Email</label>
            <input id="s-email" type="email" className="field" {...bind("contactEmail")} />
          </div>
          <div>
            <label className="field-label" htmlFor="s-phone">聯絡電話</label>
            <input id="s-phone" className="field" {...bind("contactPhone")} />
          </div>
          <div>
            <label className="field-label" htmlFor="s-social">社群帳號或連結</label>
            <input id="s-social" className="field" placeholder="例如 Instagram 連結或帳號" {...bind("contactSocial")} />
          </div>
        </div>
      </section>

      <section className="surface flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl">接單狀態</h2>
          <p className="mt-1 text-sm text-cocoa-soft">暫停後顧客無法送出新訂單，既有訂單不受影響。</p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Toggle checked={form.isAcceptingOrders} onChange={(value) => setForm((current) => ({ ...current, isAcceptingOrders: value }))} label="開放接單" />
          {form.isAcceptingOrders ? "開放接單" : "暫停接單"}
        </label>
      </section>

      <div className="flex items-center justify-end gap-4">
        {error ? <p className="text-sm text-[#8A4B3D]">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "儲存中…" : "儲存設定"}</button>
      </div>
    </form>
  );
}
