"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ShopSettings } from "@/db/schema";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

export function StoreContentForm({ settings }: { settings: ShopSettings }) {
  const router = useRouter();
  const { toast } = useStore();
  const [form, setForm] = useState({
    pickupIntro: settings.pickupIntro,
    orderingNotice: settings.orderingNotice,
    privacyNotice: settings.privacyNotice,
    termsText: settings.termsText,
    faqText: settings.faqText,
    cautionText: settings.cautionText,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await apiRequest("/api/admin/content", {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "儲存失敗，請再試一次。");
      toast(result.data.error ?? "儲存失敗，請再試一次。", "error");
      return;
    }
    toast("前台內容已儲存。");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="surface rounded-xl p-5 sm:p-7">
        <p className="eyebrow">01 · Ordering</p>
        <h2 className="mt-2 text-2xl">訂購與面交說明</h2>
        <p className="mt-2 text-sm text-cocoa-soft">內容會出現在訂購須知頁，請用清楚、簡短的文字說明實際流程。</p>
        <div className="mt-5 grid gap-5">
          <label>
            <span className="field-label">面交取貨說明</span>
            <textarea className="field min-h-28" placeholder="面交地點、取貨方式和付款方式…" {...bind("pickupIntro")} />
          </label>
          <label>
            <span className="field-label">訂購流程（每行一個步驟）</span>
            <textarea className="field min-h-32" placeholder={"① 選擇甜點。\n② 登入會員並選擇面交時段。\n③ 等待店家確認。"} {...bind("orderingNotice")} />
          </label>
          <label>
            <span className="field-label">購買前注意事項（每行一點）</span>
            <textarea className="field min-h-28" placeholder={"冷藏甜點請自備保冷袋。\n請確認商品過敏原資訊。"} {...bind("cautionText")} />
          </label>
        </div>
      </section>

      <section className="surface rounded-xl p-5 sm:p-7">
        <p className="eyebrow">02 · Help center</p>
        <h2 className="mt-2 text-2xl">常見問題</h2>
        <p className="mt-2 text-sm text-cocoa-soft">每行輸入一組，使用「問題 | 答案」分隔；空白行會忽略。</p>
        <textarea
          className="field mt-5 min-h-44"
          placeholder={"可以宅配嗎？ | 目前只提供面交取貨。\n如何取消訂單？ | 請透過頁尾聯絡方式與店家聯繫。"}
          {...bind("faqText")}
        />
        <a href="/faq" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-caramel-deep underline underline-offset-4">預覽前台常見問題 →</a>
      </section>

      <section className="surface rounded-xl p-5 sm:p-7">
        <p className="eyebrow">03 · Policies</p>
        <h2 className="mt-2 text-2xl">條款與隱私權</h2>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">
          會員註冊時會要求同意服務條款並確認已閱讀隱私權告知。請依實際資料使用方式撰寫；此編輯器不會自動產生法律意見。
        </p>
        <div className="mt-5 grid gap-5">
          <label>
            <span className="field-label">服務條款（每行一段）</span>
            <textarea className="field min-h-44" placeholder="訂單確認方式、面交與付款規則、取消方式…" {...bind("termsText")} />
          </label>
          <label>
            <span className="field-label">隱私權告知</span>
            <textarea className="field min-h-36" placeholder="蒐集哪些資料、用途、保存與聯絡方式；說明商品統計為彙總數字。" {...bind("privacyNotice")} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <a href="/terms" target="_blank" rel="noreferrer" className="text-caramel-deep underline underline-offset-4">預覽服務條款 →</a>
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-caramel-deep underline underline-offset-4">預覽隱私權告知 →</a>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-4 rounded-xl border border-mist/70 bg-cream/95 p-3 shadow-lg backdrop-blur">
        <p role="status" className="min-w-0 text-sm text-[#8A4B3D]">{error ?? "儲存後立即更新前台顯示。"}</p>
        <button type="submit" className="btn btn-primary shrink-0" disabled={pending}>
          {pending ? "儲存中…" : "儲存所有內容"}
        </button>
      </div>
    </form>
  );
}
