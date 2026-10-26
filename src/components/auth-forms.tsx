"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useStore } from "./store-provider";

function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const target = safeNext(next);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; user?: { name: string; role: string } };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "登入失敗，請再試一次。");
        return;
      }
      toast(`歡迎回來，${data.user?.name ?? ""}。`);
      const destination = target === "/" && data.user?.role === "admin" ? "/admin" : target;
      router.push(destination);
      router.refresh();
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="login-email" className="field-label">電子郵件</label>
        <input
          id="login-email"
          type="email"
          className="field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="login-password" className="field-label">密碼</label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            className="field pr-12"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-4 text-cocoa-soft transition-colors hover:text-caramel-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.6 4.2 9.5 6-.4.8-1.3 2.1-2.7 3.3M6.2 6.2C4.2 7.5 2.9 9.5 2.5 11c.9 1.8 4.3 6 9.5 6 1 0 2-.2 2.8-.5" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div aria-live="polite" className="min-h-5">
        {error ? (
          <div className="animate-fade-in">
            <p className="text-sm text-[#8A4B3D]">{error}</p>
            {error.includes("尚未啟用") ? <Link href="/resend-activation" className="mt-1 inline-block text-sm text-caramel-deep underline underline-offset-4">立即重寄啟用信</Link> : null}
          </div>
        ) : null}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "登入中…" : "登入"}
      </button>
      <p className="-mt-2 text-center text-sm">
        <Link href="/forgot-password" className="text-caramel-deep underline underline-offset-4">忘記密碼？</Link>
      </p>
      <p className="-mt-3 text-center text-sm">
        <Link href="/resend-activation" className="text-caramel-deep underline underline-offset-4">未收到啟用信或需要重新驗證？</Link>
      </p>
      <p className="text-center text-sm text-cocoa-soft">
        還沒有帳號？
        <Link href={`/register${next ? `?next=${encodeURIComponent(target)}` : ""}`} className="ml-1 underline decoration-mist underline-offset-4 hover:text-caramel-deep">
          建立會員
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const target = safeNext(next);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (form.password !== form.passwordConfirm) {
      setError("兩次輸入的密碼不一致。");
      return;
    }
    if (!termsAccepted || !privacyAcknowledged) {
      setError("請先閱讀並同意服務條款及隱私權告知。");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, termsAccepted, privacyAcknowledged, next }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "註冊失敗，請再試一次。");
        return;
      }
      setMessage(data.message ?? "請查看 Email 完成帳號啟用。");
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="reg-name" className="field-label">顯示名稱</label>
        <input id="reg-name" type="text" className="field" autoComplete="name" required minLength={2} maxLength={40} {...bind("name")} />
      </div>
      <div>
        <label htmlFor="reg-email" className="field-label">電子郵件</label>
        <input id="reg-email" type="email" className="field" autoComplete="email" required {...bind("email")} />
      </div>
      <div>
        <label htmlFor="reg-password" className="field-label">密碼</label>
        <div className="relative">
          <input id="reg-password" type={showPassword ? "text" : "password"} className="field pr-12" autoComplete="new-password" required minLength={8} {...bind("password")} />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-4 text-cocoa-soft transition-colors hover:text-caramel-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.6 4.2 9.5 6-.4.8-1.3 2.1-2.7 3.3M6.2 6.2C4.2 7.5 2.9 9.5 2.5 11c.9 1.8 4.3 6 9.5 6 1 0 2-.2 2.8-.5" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-cocoa-soft">至少 8 個字元，需包含英文字母與數字。</p>
      </div>
      <div>
        <label htmlFor="reg-password-confirm" className="field-label">確認密碼</label>
        <div className="relative">
          <input id="reg-password-confirm" type={showPasswordConfirm ? "text" : "password"} className="field pr-12" autoComplete="new-password" required {...bind("passwordConfirm")} />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-4 text-cocoa-soft transition-colors hover:text-caramel-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
            onClick={() => setShowPasswordConfirm((visible) => !visible)}
            aria-label={showPasswordConfirm ? "隱藏確認密碼" : "顯示確認密碼"}
            aria-pressed={showPasswordConfirm}
          >
            {showPasswordConfirm ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.6 4.2 9.5 6-.4.8-1.3 2.1-2.7 3.3M6.2 6.2C4.2 7.5 2.9 9.5 2.5 11c.9 1.8 4.3 6 9.5 6 1 0 2-.2 2.8-.5" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-mist/70 bg-cream/50 p-4">
        <legend className="px-1 text-xs tracking-[0.12em] text-cocoa-soft">註冊前請確認</legend>
        <label className="flex items-start gap-2.5 text-sm leading-relaxed text-cocoa">
          <input
            type="checkbox"
            className="mt-1 accent-caramel"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            required
          />
          <span>
            我已閱讀並同意
            <Link href="/terms" target="_blank" className="mx-1 text-caramel-deep underline underline-offset-4">服務條款</Link>
            。
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm leading-relaxed text-cocoa">
          <input
            type="checkbox"
            className="mt-1 accent-caramel"
            checked={privacyAcknowledged}
            onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
            required
          />
          <span>
            我已閱讀
            <Link href="/privacy" target="_blank" className="mx-1 text-caramel-deep underline underline-offset-4">隱私權告知</Link>
            ，並了解資料使用方式。
          </span>
        </label>
      </fieldset>
      <div aria-live="polite" className="min-h-5">
        {error ? <p className="text-sm text-[#8A4B3D] animate-fade-in">{error}</p> : null}
      </div>
      {message ? <div role="status" className="rounded-lg border border-mist bg-cream/50 p-4 text-sm leading-relaxed text-cocoa-soft">{message} 請先檢查收件匣；若沒有看到，請到垃圾郵件資料夾，並將信件移至收件匣、回報為「非垃圾郵件」。</div> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "建立中…" : "建立會員"}
      </button>
      <p className="text-center text-sm text-cocoa-soft">
        已經有帳號？
        <Link href={`/login${next ? `?next=${encodeURIComponent(target)}` : ""}`} className="ml-1 underline decoration-mist underline-offset-4 hover:text-caramel-deep">
          直接登入
        </Link>
      </p>
    </form>
  );
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const [pending, setPending] = useState(false);

  const onLogout = async () => {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast("已安全登出。", "info");
      router.push("/");
      router.refresh();
    } catch {
      toast("登出時發生問題，請重新整理後再試。", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" onClick={onLogout} disabled={pending} className={className || "btn btn-secondary btn-sm"}>
      {pending ? "登出中…" : "登出"}
    </button>
  );
}
