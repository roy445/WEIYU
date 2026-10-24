import type { Metadata } from "next";
import { ResendActivationForm } from "@/components/activation-forms";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "重寄帳號啟用信" };

export default function ResendActivationPage() {
  return (
    <div className="container-wy flex min-h-[70vh] items-center justify-center py-16">
      <div className="surface w-full max-w-md rounded-xl px-7 py-10 sm:px-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-24 w-[4.3rem] text-caramel" strokeWidth={1.8} title="WEIYU 唯遇甜所 品牌標誌" />
          <p className="eyebrow mt-5">Email verification</p>
          <h1 className="mt-3 text-3xl">重寄啟用信</h1>
          <p className="mt-3 text-sm text-cocoa-soft">既有會員也需要重新驗證 Email。請輸入註冊時使用的信箱。</p>
        </div>
        <ResendActivationForm />
      </div>
    </div>
  );
}
