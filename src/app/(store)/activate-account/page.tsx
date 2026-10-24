import type { Metadata } from "next";
import Link from "next/link";
import { ActivateAccountForm } from "@/components/activation-forms";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = {
  title: "啟用會員帳號",
  robots: { index: false, follow: false },
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const { token, next } = await searchParams;
  return (
    <div className="container-wy flex min-h-[70vh] items-center justify-center py-16">
      <div className="surface w-full max-w-md rounded-xl px-7 py-10 sm:px-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-24 w-[4.3rem] text-caramel" strokeWidth={1.8} title="WEIYU 唯遇甜所 品牌標誌" />
          <p className="eyebrow mt-5">Verify your email</p>
          <h1 className="mt-3 text-3xl">啟用會員帳號</h1>
          <p className="mt-3 text-sm text-cocoa-soft">啟用成功後即可登入並使用會員功能。</p>
        </div>
        {token ? (
          <ActivateAccountForm token={token} next={next} />
        ) : (
          <div className="mt-8 space-y-4 text-center text-sm text-cocoa-soft">
            <p>啟用連結無效或不完整，請重新申請啟用信。</p>
            <Link href="/resend-activation" className="btn btn-primary block w-full">重新寄送啟用信</Link>
          </div>
        )}
      </div>
    </div>
  );
}
