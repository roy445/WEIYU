import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "服務條款",
  description: "唯遇甜所服務條款與訂購約定。",
};

export const dynamic = "force-dynamic";

const defaultTerms = [
  "本網站目前提供手作甜點預訂、面交取貨與取貨時付款服務，不提供宅配、外送或線上付款。",
  "送出訂單代表提出訂購需求；訂單需經店家確認後成立。商品供應、價格與面交時段以網站當時資訊及店家確認為準。",
  "請確認聯絡資料、商品規格、過敏原資訊及面交安排正確。如需更改或取消，請儘早透過店家提供的聯絡方式聯繫。",
  "商品為手工製作，外觀可能略有差異。過敏原與保存資訊請參閱各商品頁；有特殊飲食或過敏疑慮時，請先聯繫確認。",
  "會員應妥善保管自己的登入資訊，並提供正確的聯絡資料，以利訂單確認及面交聯繫。",
  "註冊會員須先完成 Email 啟用，啟用前無法登入或使用會員功能；新註冊資料如於 1 小時內未啟用，系統會自動刪除，使用者須重新註冊。既有會員亦須重新驗證 Email。",
];

const rewardsTerms = [
  "店家贈送的 NEW50 優惠券會直接加入會員帳戶；登入後可於「我的優惠券」查看，結帳時選取即可，無須手動輸入代碼。優惠券門檻、折抵金額及使用期限以券面與帳戶顯示為準；本活動不限定新會員或首購。",
  "每筆訂單僅可使用一張已領取且尚未到期的折價券；折價券到期日、優惠方式、最低消費及可領取數量由店家設定。優惠券需於結帳選用，不能兌換現金。",
  "折價券可與甜甜數折抵併用。百分比折扣依商品小計計算，結果如有小數無條件捨去至整數元，並以優惠券設定的最高折抵金額為上限。每 1 點甜甜數折抵新臺幣 1 元，最高不超過折價後商品小計。",
  "訂單完成取貨後，依折價券及甜甜數折抵後的實付商品金額，每滿新臺幣 50 元回饋 1 點甜甜數；不足 50 元部分無條件捨去。例如實付 149 元可得 2 點甜甜數。甜甜數不計入運費，且須待訂單標記完成後才發放。",
  "消費回饋或優惠券兌換取得的甜甜數，自取得日起 3 個月到期。結帳折抵時系統會優先使用較早到期的甜甜數；逾期甜甜數不可使用。",
  "若訂單取消，已使用的未到期甜甜數及仍有效的優惠券會退回帳戶；訂單未完成不會發放消費回饋甜甜數。",
  "百分比優惠券須依券面設定的最高折抵金額計算，折扣結果有小數時無條件捨去至整數元。",
  "會員可自行開啟商品價格與庫存追蹤提醒，並可隨時關閉；價格或庫存變化不代表商品已保留，實際供應與售價以商品頁及結帳時資料為準。",
  "店家得依營運需要調整或停止未來的優惠活動。已領取優惠券仍依券面所列優惠與期限使用；系統會保留訂單折抵及甜甜數紀錄以供查詢。",
];

export default async function TermsPage() {
  const settings = await getShopSettings();
  const paragraphs = settings.termsText.trim()
    ? settings.termsText.split(/\r?\n/).filter(Boolean)
    : defaultTerms;

  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Terms of service</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">服務條款</h1>
        <p className="mt-5 text-sm leading-relaxed text-cocoa-soft">
          下列內容說明目前的訂購方式與使用約定。如有疑問，請在送出訂單前先聯繫店家。
        </p>
      </Reveal>
      <Reveal className="surface mt-10 max-w-3xl space-y-4 rounded-lg p-6 text-sm leading-[1.9] text-cocoa-soft sm:p-8">
        {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
        <div className="border-t border-mist/70 pt-5">
          <h2 className="text-xl text-cocoa">帳號 Email 啟用規則</h2>
          <p className="mt-3">註冊會員須先完成 Email 啟用，啟用前無法登入或使用會員功能；新註冊資料如於 1 小時內未啟用，系統會自動刪除，使用者須重新註冊。既有會員亦須重新驗證 Email。</p>
        </div>
        <div className="border-t border-mist/70 pt-5">
          <h2 className="text-xl text-cocoa">甜甜數與優惠券規則</h2>
          <div className="mt-3 space-y-3">
            {rewardsTerms.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
        {!settings.termsText.trim() ? (
          <p className="border-t border-mist/70 pt-4 text-xs">
            以上為一般訂購資訊範本，店家應依實際營運方式及適用法規確認、調整後再使用。
          </p>
        ) : null}
      </Reveal>
    </div>
  );
}
