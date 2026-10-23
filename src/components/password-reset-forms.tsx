"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "目前無法處理，請稍後再試。");
        return;
      }
      setMessage(data.message ?? "請查看你的電子郵件。");
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
        <input type="email" autoComplete="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <p aria-live="polite" className={`min-h-5 text-sm ${error ? "text-[#8A4B3D]" : "text-cocoa-soft"}`}>{error ?? message}</p>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "寄送中…" : "寄送重設連結"}</button>
      <p className="text-center text-sm"><Link href="/login" className="text-caramel-deep underline underline-offset-4">返回登入</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "無法重設密碼，請重新申請連結。");
        return;
      }
      router.push("/login?passwordReset=1");
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="field-label">新密碼</span>
        <input type="password" autoComplete="new-password" className="field" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        <span className="mt-1 block text-xs text-cocoa-soft">至少 8 個字元，需包含英文字母與數字。</span>
      </label>
      <label className="block">
        <span className="field-label">再次輸入新密碼</span>
        <input type="password" autoComplete="new-password" className="field" minLength={8} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required />
      </label>
      <p aria-live="polite" className="min-h-5 text-sm text-[#8A4B3D]">{error}</p>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "更新中…" : "設定新密碼"}</button>
    </form>
  );
}
