import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "常見問題" };
export const dynamic = "force-dynamic";

const defaultFaqs = [
  { q: "可以宅配或外送嗎？", a: "目前只提供面交取貨，不提供宅配、郵寄或外送。" },
  { q: "可以線上付款嗎？", a: "目前只接受面交取貨時當面付款，不提供線上刷卡或其他線上金流。網站不會要求你輸入信用卡或銀行帳戶資料。" },
  { q: "送出訂單後就代表店家已確認嗎？", a: "送出後訂單會先顯示「待店家確認」。店家確認商品庫存與面交安排後，狀態會更新為「已確認／待面交」。請到會員中心的訂單頁查看最新進度。" },
  { q: "如何查看訂單狀態？", a: "登入後前往「會員中心 → 訂單」，點選訂單即可查看訂單狀態、商品明細、面交地點與預約時段。" },
  { q: "訂單成立或狀態更新會收到通知嗎？", a: "訂單成立及店家更新訂單或付款狀態時，網站會寄送 Email 通知。若未收到，請檢查垃圾郵件，或登入會員中心查看訂單狀態；Email 延遲不會影響訂單資料。" },
  { q: "可以更改或取消訂單嗎？", a: "會員目前無法直接在網站修改或取消已送出的訂單。請儘早使用網站頁尾的聯絡方式提供訂單編號並聯繫店家，是否能調整需依訂單製作與面交進度確認。" },
  { q: "為什麼沒有可選的面交時段？", a: "結帳頁只會顯示店家目前開放且仍有名額的地點和時段。若沒有選項，可能尚未開放預約、時段已額滿或暫停接單，請稍後再查看或聯繫店家。" },
  { q: "可以指定其他面交地點或時間嗎？", a: "請先選擇結帳頁提供的時段。若需要其他安排，請在訂單備註提出並聯繫店家；提出需求不代表已完成更改，請以店家確認為準。" },
  { q: "商品的成分和過敏原在哪裡查看？", a: "請查看各商品頁的成分及過敏原欄位。如有嚴重過敏或資訊不完整，請在下單前聯繫店家確認；請勿只依商品照片判斷是否適合食用。" },
  { q: "甜點要如何保存？", a: "保存方式與賞味期限依商品而異，請以商品頁及取貨時提供的資訊為準。收到甜點後請儘快依標示保存；如有疑問，請先聯繫店家。" },
  { q: "忘記會員密碼怎麼辦？", a: "在登入頁點選「忘記密碼」，輸入註冊 Email 後申請重設連結。連結有效 30 分鐘；若未收到信，請檢查垃圾郵件，稍後重試，或透過頁尾聯絡方式尋求協助。" },
  { q: "如何更新會員資料或頭像？", a: "登入後前往會員中心的會員資料，可更新顯示名稱、聯絡電話、頭像及明暗主題。電子郵件目前作為登入帳號使用，不能直接在會員資料中修改。" },
  { q: "公告通知在哪裡查看？", a: "登入後點選頁首的鈴鐺圖示，即可查看店家公告並標示已讀。若公告有寄送 Email，也會寄到會員註冊時使用的信箱。" },
  { q: "沒有收到密碼重設或訂單 Email 怎麼辦？", a: "先檢查垃圾郵件及註冊 Email 是否正確，再稍後重試。你仍可登入會員中心查看訂單；若持續沒有收到，請透過網站頁尾的聯絡方式提供相關訂單資訊，避免在公開留言中張貼個人資料。" },
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
      <Reveal className="max-w-2xl"><p className="eyebrow">Help center</p><h1 className="mt-4 text-4xl sm:text-5xl">常見問題</h1><p className="mt-5 text-sm leading-relaxed text-cocoa-soft">整理訂購、付款、面交、商品保存、會員帳號與通知的常見說明。若仍有疑問，請透過頁尾聯絡方式與店家聯繫。</p></Reveal>
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
