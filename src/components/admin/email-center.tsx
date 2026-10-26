"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

type AudienceId = "verified_customers" | "all_customers" | "new50_holders";
type AudienceCounts = Record<AudienceId, number>;

type EmailSample = {
  id: string;
  name: string;
  audience: AudienceId;
  subject: string;
  title: string;
  body: string;
};

const samples: EmailSample[] = [
  {
    id: "new50",
    name: "NEW50 優惠券通知",
    audience: "new50_holders",
    subject: "一張 NT$50 優惠券，已送到你的帳戶｜WEIYU",
    title: "一張小小心意，送給你",
    body: "親愛的甜點好友，\n\n感謝你支持 WEIYU 唯遇甜所。我們已把一張 NEW50 優惠券直接放進你的帳戶。\n\n單筆消費滿 NT$300 可折抵 NT$50。結帳時請在「使用優惠券」選擇此券，不需要手動輸入優惠代碼。\n\n你可以登入會員中心查看優惠券狀態與使用期限。期待下一次，和你分享剛出爐的甜點。\n\nWEIYU 唯遇甜所",
  },
  {
    id: "product-news",
    name: "新品／活動通知範例",
    audience: "verified_customers",
    subject: "甜點新消息｜WEIYU 唯遇甜所",
    title: "有一則甜點消息想和你分享",
    body: "親愛的甜點好友，\n\n〔請填寫新品或活動內容、期間與適用條件〕\n\n更多資訊與目前供應情形，請以網站商品頁及公告內容為準。\n\nWEIYU 唯遇甜所",
  },
  {
    id: "pickup-update",
    name: "取貨／面交通知範例",
    audience: "verified_customers",
    subject: "取貨資訊提醒｜WEIYU 唯遇甜所",
    title: "關於本次取貨安排",
    body: "親愛的甜點好友，\n\n〔請填寫日期、地點、調整後時段與聯絡方式〕\n\n若你已下單，請以會員中心訂單詳情顯示的取貨資訊為準。如需協助，歡迎透過網站聯絡我們。\n\n謝謝你，期待面交時見到你。\n\nWEIYU 唯遇甜所",
  },
];

const audienceLabels: Record<AudienceId, string> = {
  verified_customers: "已驗證 Email 的顧客會員",
  all_customers: "全部顧客會員（含未驗證 Email）",
  new50_holders: "可用 NEW50 優惠券持有人（可能含未驗證 Email）",
};

export function EmailCenter() {
  const router = useRouter();
  const { toast } = useStore();
  const [templateId, setTemplateId] = useState(samples[0].id);
  const [audience, setAudience] = useState<AudienceId>(samples[0].audience);
  const [subject, setSubject] = useState(samples[0].subject);
  const [title, setTitle] = useState(samples[0].title);
  const [body, setBody] = useState(samples[0].body);
  const [counts, setCounts] = useState<AudienceCounts | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [sending, setSending] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [maxRecipients, setMaxRecipients] = useState(100);

  useEffect(() => {
    let active = true;
    void apiRequest<{ audiences?: AudienceCounts; maxRecipients?: number }>("/api/admin/email-center", { method: "GET" }).then((result) => {
      if (!active) return;
      if (!result.ok || !result.data.audiences) {
        setLoadError(result.data.error ?? "無法載入收件對象數量，請重新整理頁面。" );
        return;
      }
      setCounts(result.data.audiences);
      setMaxRecipients(result.data.maxRecipients ?? 100);
      setLoadError("");
    });
    return () => { active = false; };
  }, []);

  const fillSample = (sample: EmailSample) => {
    setTemplateId(sample.id);
    setAudience(sample.audience);
    setSubject(sample.subject);
    setTitle(sample.title);
    setBody(sample.body);
    setReviewed(false);
    setResultMessage("");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewed || sending) return;
    setSending(true);
    setResultMessage("");
    const result = await apiRequest<{ message?: string; sent?: number; failed?: number; recipientCount?: number }>("/api/admin/email-center", {
      method: "POST",
      body: JSON.stringify({ audience, expectedRecipientCount: recipientCount, subject, title, body, reviewed: true }),
    });
    setSending(false);
    if (!result.ok) {
      const message = result.data.error ?? "郵件寄送失敗，請稍後再試。";
      toast(message, "error");
      setResultMessage(message);
      setReviewed(false);
      return;
    }
    const sent = Number(result.data.sent ?? 0);
    const failed = Number(result.data.failed ?? 0);
    const message = result.data.message ?? `寄送完成：${sent} 封成功、${failed} 封失敗。`;
    toast(message, failed > 0 ? "error" : "success");
    setResultMessage(`${message} 可至「郵件紀錄」逐封查看結果。`);
    setReviewed(false);
    router.refresh();
  };

  const recipientCount = counts?.[audience] ?? 0;
  const hasPlaceholders = body.includes("〔") || body.includes("〕");
  const currentSample = samples.find((sample) => sample.id === templateId);

  return (
    <div className="space-y-8">
      <section className="surface rounded-xl p-5 sm:p-7">
        <header>
          <p className="eyebrow">Manual email</p>
          <h2 className="mt-2 text-2xl">建立郵件並預覽</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
            套用範例後可自行修改。此頁不會自動寄信；先核對主旨、內容與收件範圍，再勾選確認並手動按下寄送。每位收件者都會各自收到郵件，結果會寫入郵件紀錄。
          </p>
        </header>

        <div className="mt-5 flex flex-wrap gap-2">
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={`btn btn-sm ${templateId === sample.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => fillSample(sample)}
            >
              套用範例：{sample.name}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="grid min-w-0 gap-4">
            <label className="block">
              <span className="field-label">收件對象</span>
              <select
                className="field"
                value={audience}
                onChange={(event) => { setAudience(event.target.value as AudienceId); setReviewed(false); setResultMessage(""); }}
              >
                {(Object.keys(audienceLabels) as AudienceId[]).map((id) => (
                  <option key={id} value={id}>{audienceLabels[id]}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs leading-relaxed text-cocoa-soft">
                {counts ? `目前符合 ${recipientCount} 位。` : "正在計算符合的收件人…"}
                {audience === "all_customers" ? " 此範圍含未驗證信箱，請先確認確有寄送需要。" : null}
                {audience === "new50_holders" ? " 此名單只含仍可使用 NEW50 的帳號，可能含未驗證信箱。" : null}
              </span>
            </label>

            {loadError ? <p role="alert" className="rounded-lg border border-[#D9A39A]/60 bg-[#FFF5F3] p-3 text-sm text-[#8A4B3D]">{loadError}</p> : null}

            <label className="block">
              <span className="field-label">Email 主旨</span>
              <input className="field" value={subject} onChange={(event) => { setSubject(event.target.value); setReviewed(false); setResultMessage(""); }} maxLength={160} minLength={2} required />
            </label>
            <label className="block">
              <span className="field-label">信件標題</span>
              <input className="field" value={title} onChange={(event) => { setTitle(event.target.value); setReviewed(false); setResultMessage(""); }} maxLength={120} minLength={2} required />
            </label>
            <label className="block">
              <span className="field-label">信件內容</span>
              <textarea className="field min-h-64 resize-y" value={body} onChange={(event) => { setBody(event.target.value); setReviewed(false); setResultMessage(""); }} maxLength={5000} minLength={10} required />
              <span className="mt-1 block text-right text-xs text-cocoa-soft">{body.length}/5000</span>
            </label>
            {hasPlaceholders ? (
              <p className="rounded-lg border border-caramel/30 bg-cream-deep/40 p-3 text-sm leading-relaxed text-cocoa">
                這份範例含有「〔提示文字〕」，請依實際資訊替換後才能寄送；系統會阻擋仍含提示文字的郵件。
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="surface overflow-hidden rounded-xl border border-mist/70 bg-[#fffdf8]">
              <div className="border-b border-mist/70 bg-cream-deep/40 px-5 py-4 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-cocoa-soft">Email preview</p>
                <p className="mt-2 break-words"><span className="text-cocoa-soft">主旨：</span>{subject || "（請輸入主旨）"}</p>
                <p className="mt-1 text-xs text-cocoa-soft">收件對象：{audienceLabels[audience]} · {counts ? `${recipientCount} 位` : "計算中"}</p>
              </div>
              <div className="px-5 py-6 sm:px-7">
                <div className="border-b border-mist/70 pb-4 text-center">
                  <Image src="/brand/email-logo.png" alt="WEIYU 唯遇甜所" width={96} height={96} className="mx-auto h-24 w-24 object-contain" />
                  <p className="mt-2 font-serif text-sm tracking-[0.24em] text-cocoa">WEIYU</p>
                  <p className="mt-1 text-[0.65rem] tracking-[0.2em] text-caramel-deep">唯遇甜所</p>
                </div>
                <h3 className="mt-5 break-words font-serif text-2xl font-medium text-cocoa">{title || "（請輸入信件標題）"}</h3>
                <div className="mt-4 min-h-40 whitespace-pre-wrap break-words text-sm leading-[1.9] text-cocoa-soft">{body || "（請輸入信件內容）"}</div>
                <p className="mt-6 border-t border-mist/70 pt-4 text-xs leading-relaxed text-cocoa-soft">此郵件由 WEIYU 唯遇甜所自動寄出。若有疑問，請透過網站聯絡方式與我們聯繫。</p>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-mist/70 bg-cream px-4 py-3 text-sm leading-relaxed text-cocoa">
              <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 accent-caramel" />
              <span>我已審閱上方 Email 預覽、主旨及收件對象，確認內容與寄送名單正確。</span>
            </label>
            <button className="btn btn-primary w-full" type="submit" disabled={sending || !reviewed || !counts || recipientCount === 0 || recipientCount > maxRecipients || hasPlaceholders || !!loadError}>
              {sending ? "寄送中…" : `手動寄出郵件（${recipientCount} 位）`}
            </button>
            {recipientCount > maxRecipients ? <p className="text-xs leading-relaxed text-[#8A4B3D]">目前收件人數超過單次上限 {maxRecipients} 位，請縮小收件範圍。</p> : null}
            {recipientCount === 0 && counts ? <p className="text-xs text-cocoa-soft">此收件範圍目前沒有符合條件的帳號，因此無法寄送。</p> : null}
            {currentSample?.id === "new50" ? <p className="text-xs leading-relaxed text-cocoa-soft">此範例初稿依 NEW50 現行條件撰寫：滿 NT$300 折 NT$50，結帳選券、無須輸入代碼。若修改內容，請重新核對優惠條件。</p> : null}
            {resultMessage ? <p role="status" className="rounded-lg border border-mist/70 bg-cream-deep/40 p-3 text-sm leading-relaxed text-cocoa">{resultMessage}</p> : null}
            <Link href="/admin/email-logs" className="inline-block text-sm text-caramel-deep underline underline-offset-4">查看郵件寄送紀錄</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
