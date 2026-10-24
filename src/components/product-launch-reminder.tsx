"use client";

import { useState, type FormEvent } from "react";
import { apiRequest } from "@/components/admin/dialog";

export function ProductLaunchReminder({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const result = await apiRequest<{ message?: string }>(`/api/products/${encodeURIComponent(slug)}/launch-reminders`, {
      method: "POST",
      body: JSON.stringify({ email, consent }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "登記失敗，請稍後再試。");
      return;
    }
    setMessage(result.data.message ?? "已登記上架提醒。");
  };

  return (
    <section className="rounded-xl border border-caramel/30 bg-oat-soft/50 p-5" aria-labelledby="launch-reminder-title">
      <p className="eyebrow">Coming soon</p>
      <h2 id="launch-reminder-title" className="mt-2 text-xl">想在上架時收到通知？</h2>
      <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">留下 Email，我們只會用來寄送這款甜點的上架提醒，不會加入其他行銷郵件。</p>
      {message ? (
        <p role="status" className="mt-4 rounded-lg bg-[#E4EDE4] px-4 py-3 text-sm text-[#3F5B41]">{message}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="field-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="field"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-cocoa-soft">
            <input
              type="checkbox"
              className="mt-0.5 accent-caramel"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>我同意唯遇甜所使用此 Email 寄送這款商品的上架提醒。</span>
          </label>
          {error ? <p role="alert" className="text-sm text-[#8A4B3D]">{error}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "登記中…" : "提醒我上架"}
          </button>
        </form>
      )}
    </section>
  );
}
