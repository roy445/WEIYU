import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "商店設定" };

export default async function AdminSettingsPage() {
  const settings = await getShopSettings();
  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-3 text-3xl">商店設定</h1>
        <p className="mt-2 text-sm text-cocoa-soft">管理品牌識別、聯絡方式與接單狀態；條款、常見問題及前台文案請到「客製化中心」編輯。</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
