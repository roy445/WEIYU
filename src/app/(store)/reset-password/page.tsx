import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "重設密碼", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-wy flex min-h-[70vh] items-center justify-center py-16">
      <div className="surface w-full max-w-md rounded-xl px-7 py-10 sm:px-10">
        <p className="eyebrow">New password</p>
        <h1 className="mt-3 text-3xl">設定新密碼</h1>
        {token ? <ResetPasswordForm token={token} /> : <p className="mt-5 text-sm text-[#8A4B3D]">重設連結無效，請重新申請。</p>}
      </div>
    </div>
  );
}
