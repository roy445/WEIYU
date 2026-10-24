"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

export function ActivateAccountForm({ token, next }: { token: string; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        user?: { role: string };
      };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "啟用失敗，請重新申請啟用信。");
        return;
      }
      setMessage(data.message ?? "帳號已啟用。");
      const destination = safeNext(next);
      router.push(destination === "/account" && data.user?.role === "admin" ? "/admin" : destination);
      router.refresh();
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <p className="text-sm leading-relaxed text-cocoa-soft">
        請按下方按鈕完成啟用。為避免郵件安全掃描器誤觸，開啟此頁不會直接啟用帳號。
      </p>
      {error ? <p role="alert" className="text-sm text-[#8A4B3D]">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-cocoa-soft">{message}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "啟用中…" : "啟用會員帳號"}
      </button>
      <p className="text-center text-sm">
        <Link href="/resend-activation" className="text-caramel-deep underline underline-offset-4">啟用連結失效？重新寄送</Link>
      </p>
    </form>
  );
}

export function ResendActivationForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/resend-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "目前無法寄送，請稍後再試。");
        return;
      }
      setMessage(data.message ?? "若此 Email 需要啟用，啟用信已寄出。");
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="field-label">註冊時使用的 Email</span>
        <input
          type="email"
          autoComplete="email"
          className="field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      {error ? <p role="alert" className="text-sm text-[#8A4B3D]">{error}</p> : null}
      {message ? <p role="status" className="rounded-lg border border-mist bg-cream/50 p-4 text-sm leading-relaxed text-cocoa-soft">{message} 請檢查垃圾郵件；若信件在其中，請移至收件匣並回報為「非垃圾郵件」。</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "寄送中…" : "寄送啟用信"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-caramel-deep underline underline-offset-4">返回登入</Link>
      </p>
    </form>
  );
}
