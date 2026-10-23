"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "./store-provider";

export function PasswordForm({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useStore();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (form.newPassword !== form.newPasswordConfirm) {
      setError("兩次輸入的新密碼不一致。");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "更新密碼失敗。");
        return;
      }
      setSuccess(data.message ?? "密碼已更新。");
      setForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      toast("密碼已更新。");
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="pw-current" className="field-label">目前密碼</label>
        <input id="pw-current" type="password" className="field" autoComplete="current-password" required {...bind("currentPassword")} />
      </div>
      <div>
        <label htmlFor="pw-new" className="field-label">新密碼</label>
        <input id="pw-new" type="password" className="field" autoComplete="new-password" required minLength={isAdmin ? 10 : 8} {...bind("newPassword")} />
        <p className="mt-1.5 text-xs text-cocoa-soft">
          至少 {isAdmin ? 10 : 8} 個字元，需包含英文字母與數字。更新後其他裝置會自動登出。
        </p>
      </div>
      <div>
        <label htmlFor="pw-confirm" className="field-label">確認新密碼</label>
        <input id="pw-confirm" type="password" className="field" autoComplete="new-password" required {...bind("newPasswordConfirm")} />
      </div>
      <div aria-live="polite" className="min-h-5">
        {error ? <p className="text-sm text-[#8A4B3D] animate-fade-in">{error}</p> : null}
        {success ? <p className="text-sm text-[#3F5B41] animate-fade-in">{success}</p> : null}
      </div>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
        {pending ? "更新中…" : "更新密碼"}
      </button>
    </form>
  );
}
