"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

type AnnouncementSummary = {
  id: number;
  title: string;
  body: string;
  type: string;
  displayMode: string;
  sendEmail: boolean;
  publishedAt: string | Date;
  recipientCount: number;
  emailSent: number;
  emailFailed: number;
};

const samples = [
  {
    title: "本週面交時段公告",
    body: "本週新增週六下午面交時段，歡迎至網站選擇可預約時段。如需協助，請透過網站聯絡我們。",
    type: "info",
  },
  {
    title: "端午節接單安排",
    body: "端午節期間的訂單將於指定日期面交，請下單前確認商品頁與結帳頁的取貨日期及時段。",
    type: "important",
  },
  {
    title: "季節限定甜點上架",
    body: "本季限定甜點已上架，數量有限。歡迎前往商品頁查看品項、成分及可預約的面交時段。",
    type: "promotion",
  },
] as const;

const typeLabels: Record<string, string> = {
  info: "一般公告",
  important: "重要通知",
  promotion: "新品／活動",
};

export function AnnouncementManager({ announcements }: { announcements: AnnouncementSummary[] }) {
  const router = useRouter();
  const { toast } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"info" | "important" | "promotion">("info");
  const [displayMode, setDisplayMode] = useState<"inbox" | "marquee" | "pinned">("inbox");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailReviewed, setEmailReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const fillSample = (sample: typeof samples[number]) => {
    setTitle(sample.title);
    setBody(sample.body);
    setType(sample.type);
    setEmailReviewed(false);
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    if (sendEmail && !emailReviewed) return;
    setPending(true);
    const result = await apiRequest("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ title, body, type, displayMode, sendEmail, emailReviewed }),
    });
    setPending(false);
    if (!result.ok) {
      toast(result.data.error ?? "公告發布失敗。", "error");
      return;
    }
    const emailSent = Number(result.data.emailSent ?? 0);
    const emailReminder = emailSent > 0 ? " 若會員未收到，請提醒查看垃圾郵件。" : "";
    toast(`${result.data.message ?? "公告已發布。"}${emailReminder}`, result.data.emailFailed ? "error" : "success");
    setTitle("");
    setBody("");
    setType("info");
    setDisplayMode("inbox");
    setSendEmail(false);
    setEmailReviewed(false);
    router.refresh();
  };

  const retryEmail = async (id: number) => {
    setRetryingId(id);
    const result = await apiRequest(`/api/admin/announcements/${id}/retry-email`, { method: "POST" });
    setRetryingId(null);
    if (!result.ok) {
      toast(result.data.error ?? "Email 重試失敗。", "error");
      return;
    }
    const emailSent = Number(result.data.sent ?? 0);
    const emailReminder = emailSent > 0 ? " 若會員未收到，請提醒查看垃圾郵件。" : "";
    toast(`${result.data.message ?? "Email 重試完成。"}${emailReminder}`, result.data.failed ? "error" : "success");
    router.refresh();
  };

  return (
    <div className="space-y-10">
      <section className="surface rounded-xl p-5 sm:p-7">
        <div>
          <p className="eyebrow">New announcement</p>
          <h2 className="mt-2 text-2xl">發布公告</h2>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">
            發布後會立即出現在會員的站內通知。若也要寄 Email，請先勾選寄送選項、預覽內容並確認；未勾選時只會建立站內通知。
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {samples.map((sample) => (
            <button key={sample.title} type="button" className="btn btn-secondary btn-sm" onClick={() => fillSample(sample)}>
              套用範例：{sample.title}
            </button>
          ))}
        </div>

        <form onSubmit={publish} className="mt-6 grid gap-4">
          <label className="block">
            <span className="field-label">公告標題</span>
              <input className="field" value={title} onChange={(event) => { setTitle(event.target.value); setEmailReviewed(false); }} maxLength={100} minLength={2} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">公告類型</span>
              <select className="field" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <option value="info">一般公告</option>
                <option value="important">重要通知</option>
                <option value="promotion">新品／活動</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">公告呈現位置</span>
              <select className="field" value={displayMode} onChange={(event) => setDisplayMode(event.target.value as typeof displayMode)}>
                <option value="inbox">僅站內通知</option>
                <option value="marquee">首頁跑馬燈</option>
                <option value="pinned">全站置頂公告</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-mist/70 px-4 py-3 text-sm text-cocoa">
              <input type="checkbox" checked={sendEmail} onChange={(event) => { setSendEmail(event.target.checked); setEmailReviewed(false); }} className="accent-caramel" />
              詢問並確認後，同時寄送提醒 Email 給會員
            </label>
          </div>
          <label className="block">
            <span className="field-label">公告內容</span>
            <textarea className="field min-h-36 resize-y" value={body} onChange={(event) => { setBody(event.target.value); setEmailReviewed(false); }} maxLength={3000} required />
            <span className="mt-1 block text-right text-xs text-cocoa-soft">{body.length}/3000</span>
          </label>
          {sendEmail ? (
            <div className="space-y-3 rounded-xl border border-mist/70 bg-cream/50 p-4 sm:p-5">
              <p className="text-sm font-medium text-cocoa">寄送前 Email 格式預覽</p>
              <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-mist bg-[#fffdf8]">
                <div className="border-b border-mist bg-cream-deep/40 px-4 py-3 text-xs text-cocoa-soft">Email 主旨：WEIYU 公告｜{title || "（公告標題）"}</div>
                <div className="p-5">
                  <div className="border-b border-mist pb-3 text-center">
                    <Image src="/brand/email-logo.png" alt="WEIYU 唯遇甜所" width={76} height={76} className="mx-auto h-16 w-16 object-contain" />
                    <p className="mt-2 font-serif text-xs tracking-[0.2em] text-caramel-deep">WEIYU 唯遇甜所</p>
                  </div>
                  <h3 className="mt-4 font-serif text-xl text-cocoa">{title || "（公告標題）"}</h3>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-cocoa-soft">{body || "（公告內容）"}</p>
                  <p className="mt-4 rounded-full bg-caramel px-4 py-2 text-center text-sm text-cream">查看站內公告</p>
                  <p className="mt-4 border-t border-mist pt-3 text-xs leading-relaxed text-cocoa-soft">此郵件由 WEIYU 唯遇甜所自動寄出。若有疑問，請透過網站聯絡方式與我們聯繫。</p>
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm leading-relaxed text-cocoa">
                <input type="checkbox" checked={emailReviewed} onChange={(event) => setEmailReviewed(event.target.checked)} className="mt-1 accent-caramel" />
                我已審閱上方郵件格式與公告內容，確認要寄給會員；內容變更後需重新確認。
              </label>
            </div>
          ) : null}
          <div>
            <button className="btn btn-primary" type="submit" disabled={pending || (sendEmail && !emailReviewed)}>
              {pending ? "發布中…" : "立即發布"}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="announcement-history">
        <div className="mb-4">
          <p className="eyebrow">History</p>
          <h2 id="announcement-history" className="mt-2 text-2xl">已發布公告</h2>
        </div>
        {announcements.length === 0 ? (
          <p className="surface rounded-xl px-5 py-8 text-sm text-cocoa-soft">目前還沒有公告。</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <article key={item.id} className="surface rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="badge bg-oat-soft text-cocoa">{typeLabels[item.type] ?? typeLabels.info}</span>
                    <span className="badge ml-2 bg-cream-deep text-cocoa">{item.displayMode === "marquee" ? "首頁跑馬燈" : item.displayMode === "pinned" ? "全站置頂" : "僅站內通知"}</span>
                    <h3 className="mt-2 text-lg">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-cocoa-soft">{item.body}</p>
                  </div>
                  <time className="text-xs text-cocoa-soft">{new Date(item.publishedAt).toLocaleString("zh-TW")}</time>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-mist/70 pt-3 text-xs text-cocoa-soft">
                  <span>站內通知：{item.recipientCount} 位會員</span>
                  {item.sendEmail ? (
                    <>
                      <span>Email 已寄：{item.emailSent}/{item.recipientCount}</span>
                      {item.emailFailed > 0 ? <span className="text-[#8A4B3D]">失敗：{item.emailFailed}</span> : null}
                      {item.emailSent < item.recipientCount ? (
                        <button type="button" className="text-caramel-deep underline underline-offset-4 disabled:opacity-50" disabled={retryingId === item.id} onClick={() => void retryEmail(item.id)}>
                          {retryingId === item.id ? "重試中…" : "重試未寄送郵件"}
                        </button>
                      ) : null}
                    </>
                  ) : <span>僅站內通知</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
