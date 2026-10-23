import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "常見問題" };
export const dynamic = "force-dynamic";

const defaultFaqs = [
  { q: "可以宅配或外送嗎？", a: "目前只提供面交取貨，不提供宅配、郵寄或外送。" },
  { q: "可以線上付款嗎？", a: "不行。付款方式固定為取貨時當面付款。" },
  { q: "訂單送出後會怎麼樣？", a: "訂單送出後會顯示待店家確認；確認庫存和面交安排後會更新狀態並寄送通知。" },
  { q: "可以取消訂單嗎？", a: "若需要取消，請使用頁尾的聯絡方式與店家聯繫。" },
  { q: "為什麼沒有可選的面交時段？", a: "可預約的面交地點和時段由店家設定，請稍後再查看。" },
];

export default async function FAQPage() {
  const settings = await getShopSettings();
  const customFaqs = settings.faqText.split(/\r?\n/).flatMap((line) => {
    const index = line.indexOf("|");
    if (index < 1) return [];
    const q = line.slice(0, index).trim();
    const a = line.slice(index + 1).trim();
    return q && a ? [{ q, a }] : [];
  });

  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl"><p className="eyebrow">Help center</p><h1 className="mt-4 text-4xl sm:text-5xl">常見問題</h1><p className="mt-5 text-sm text-cocoa-soft">下單前有疑問嗎？看看以下整理的說明。</p></Reveal>
      <div className="mt-10 max-w-3xl divide-y divide-mist/70 border-y border-mist/70">
        {[...defaultFaqs, ...customFaqs].map((faq) => (
          <details key={faq.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base text-cocoa">{faq.q}<span aria-hidden="true" className="text-caramel transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
