import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "訂購須知",
  description: "唯遇甜所訂購流程與訂單說明。",
};

export const dynamic = "force-dynamic";

const sections = [
  { href: "/pickup", number: "01", title: "面交取貨與付款", text: "查看取貨地點、預約時段與付款方式。" },
  { href: "/faq", number: "02", title: "常見問題", text: "訂單、取消、商品與付款方式常見解答。" },
  { href: "/privacy", number: "03", title: "隱私權告知", text: "了解帳號、訂單資料與商品彙總統計方式。" },
  { href: "/terms", number: "04", title: "服務條款", text: "閱讀網站使用與下單前的服務約定。" },
];

export default async function OrderingPage() {
  const settings = await getShopSettings();
  const steps = (settings.orderingNotice || "① 選擇喜歡的甜點並加入購物袋。\n② 登入會員，填寫取貨聯絡資訊。\n③ 選擇可預約的面交地點與時段。\n④ 送出訂單，等待店家確認。\n⑤ 依約面交取貨，並於取貨時付款。")
    .split(/\r?\n/)
    .filter(Boolean);

  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Ordering guide</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">訂購須知</h1>
        <p className="mt-5 text-sm leading-relaxed text-cocoa-soft">先看簡單的訂購流程，再依需要前往各自的說明頁。</p>
      </Reveal>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-2xl">五步完成預訂</h2>
        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="surface flex items-center gap-4 rounded-lg p-4">
              <span className="font-serif text-2xl text-caramel">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-sm leading-relaxed text-cocoa-soft">{step.replace(/^[①②③④⑤]\s*/, "")}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl">你想了解哪一項？</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <Link key={section.href} href={section.href} className="surface rounded-xl p-5 transition-transform hover:-translate-y-1">
              <span className="font-serif text-3xl text-caramel">{section.number}</span>
              <h3 className="mt-3 text-xl">{section.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">{section.text}</p>
              <span className="mt-4 inline-block text-sm text-caramel-deep">前往閱讀 →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
