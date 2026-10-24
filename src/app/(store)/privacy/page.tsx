import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "隱私權告知" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const settings = await getShopSettings();
  const notice = settings.privacyNotice || "為處理會員註冊、訂單確認、面交聯繫、公告通知及售後服務，本網站會使用你提供的會員與訂單聯絡資料。";

  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl"><p className="eyebrow">Privacy notice</p><h1 className="mt-4 text-4xl sm:text-5xl">隱私權告知</h1><p className="mt-5 text-sm leading-relaxed text-cocoa-soft">我們重視你的資料安全，以下說明資料使用方式。</p></Reveal>
      <div className="surface mt-10 max-w-3xl space-y-5 rounded-xl p-6 text-sm leading-[1.9] text-cocoa-soft sm:p-8">
        {notice.split(/\r?\n/).filter(Boolean).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
        <section><h2 className="text-xl">使用目的</h2><p className="mt-2">會員資料及訂單聯絡資訊僅於帳號服務、訂單處理、面交聯繫與客服所需範圍內使用。</p></section>
        <section><h2 className="text-xl">公告通知</h2><p className="mt-2">店家發布的公告會顯示於會員中心的公告通知。若公告選擇以 Email 通知，會寄送至你註冊時使用的電子郵件地址。</p></section>
        <section><h2 className="text-xl">優惠券與點數</h2><p className="mt-2">為提供優惠券領取、訂單折抵及點數累積／到期管理，本網站會保存你的優惠券領取與使用狀態、點數取得與折抵紀錄，以及相關訂單金額。優惠活動資料僅用於會員回饋、訂單處理及帳務查詢。</p></section>
        <section><h2 className="text-xl">商品統計</h2><p className="mt-2">網站會累計商品頁瀏覽與成功加入購物袋的總次數，以彙總數字了解商品受歡迎程度，不建立個別會員的瀏覽或購物袋紀錄。購物袋內容儲存在你目前使用的瀏覽器。</p></section>
        <section><h2 className="text-xl">資料相關詢問</h2><p className="mt-2">如有資料查詢或更正需求，請透過網站頁尾所列聯絡方式與店家聯繫。</p></section>
      </div>
    </div>
  );
}
