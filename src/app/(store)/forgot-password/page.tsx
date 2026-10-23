import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "忘記密碼" };

export default function ForgotPasswordPage() {
  return (
    <div className="container-wy flex min-h-[70vh] items-center justify-center py-16">
      <div className="surface w-full max-w-md rounded-xl px-7 py-10 sm:px-10">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-3 text-3xl">忘記密碼</h1>
        <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">輸入註冊 Email，我們會寄送限時重設連結。</p>
        <ForgotPasswordForm />
        <div className="mt-6 text-center"><Link href="/register" className="text-sm text-cocoa-soft underline underline-offset-4">還沒有帳號？建立會員</Link></div>
      </div>
    </div>
  );
}
