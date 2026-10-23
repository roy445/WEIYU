import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "建立會員" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <div className="container-wy flex min-h-[70vh] items-center justify-center py-16">
      <div className="surface w-full max-w-md rounded-xl px-7 py-10 animate-rise sm:px-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-24 w-[4.3rem] text-caramel" strokeWidth={1.8} title="WEIYU 唯遇甜所 品牌標誌" />
          <p className="eyebrow mt-5">Join us</p>
          <h1 className="mt-3 text-3xl">建立會員</h1>
          <p className="mt-3 text-sm text-cocoa-soft">建立帳號後即可送出面交訂單。只會收集完成訂單所需的資料。</p>
        </div>
        <div className="mt-8">
          <RegisterForm next={next} />
        </div>
      </div>
    </div>
  );
}
