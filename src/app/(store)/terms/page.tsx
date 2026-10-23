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
        {!settings.termsText.trim() ? (
          <p className="border-t border-mist/70 pt-4 text-xs">
            以上為一般訂購資訊範本，店家應依實際營運方式及適用法規確認、調整後再使用。
          </p>
        ) : null}
      </Reveal>
    </div>
  );
}
