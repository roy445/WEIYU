import type { Metadata } from "next";
import Link from "next/link";
import { StoreContentForm } from "@/components/admin/store-content-form";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "客製化中心" };

const tools = [
  { number: "A", title: "商品照片與介紹", description: "上傳商品照片、調整介紹、規格和過敏原資訊。", href: "/admin/products", action: "管理商品" },
  { number: "B", title: "商品受歡迎程度", description: "比較各商品頁瀏覽與加入購物袋的累積次數。", href: "/admin/analytics", action: "查看商品成效" },
  { number: "C", title: "會員個人偏好", description: "會員可自行設定顯示名稱、電話、彩色頭像和明暗主題。", href: "/account", action: "預覽會員中心" },
  { number: "D", title: "品牌與聯絡資訊", description: "調整品牌名稱、Logo、Email、電話與接單狀態。", href: "/admin/settings", action: "編輯商店設定" },
  { number: "E", title: "面交安排", description: "建立實際取貨地點、日期、時段和每時段可接單量。", href: "/admin/pickup", action: "管理面交時段" },
  { number: "F", title: "會員服務", description: "搜尋會員帳號並由訂單流程處理後續服務。", href: "/admin/members", action: "管理會員帳號" },
];

export default async function AdminCustomizePage() {
  const settings = await getShopSettings();

  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">Personalize your shop</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">客製化中心</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
          集中管理前台文字與常用調整入口。各功能分開操作，儲存後會更新對應頁面，不會把所有設定塞在同一張表單裡。
        </p>
      </header>

      <section aria-labelledby="toolbox-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Shop toolbox</p>
            <h2 id="toolbox-heading" className="mt-2 text-2xl">快速前往功能</h2>
          </div>
          <span className="badge bg-oat-soft text-cocoa">6 個店務工具</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <article key={tool.number} className="surface flex min-h-48 flex-col rounded-xl p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-serif text-3xl text-caramel">{tool.number}</span>
                <span aria-hidden="true" className="text-xl text-oat">✧</span>
              </div>
              <h3 className="mt-3 text-xl">{tool.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-cocoa-soft">{tool.description}</p>
              <Link href={tool.href} className="mt-4 text-sm font-medium text-caramel-deep underline underline-offset-4">{tool.action} →</Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="content-heading">
        <div className="mb-5">
          <p className="eyebrow">Front-of-store content</p>
          <h2 id="content-heading" className="mt-2 text-2xl">前台文案與顧客須知</h2>
          <p className="mt-2 text-sm text-cocoa-soft">分區編輯訂購流程、FAQ、注意事項和條款；可用每個區塊的預覽連結檢查公開畫面。</p>
        </div>
        <StoreContentForm settings={settings} />
      </section>
    </div>
  );
}
