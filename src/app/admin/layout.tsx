import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StoreProvider } from "@/components/store-provider";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "管理後台", template: "%s｜WEIYU 管理後台" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6">
        <div className="surface max-w-md rounded-xl px-8 py-10 text-center">
          <p className="eyebrow">403</p>
          <h1 className="mt-3 text-3xl">權限不足</h1>
          <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">
            這個區域僅限管理員使用。如果你是店家，請使用管理員帳號登入。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="btn btn-secondary btn-sm">回到首頁</Link>
            <Link href="/account" className="btn btn-primary btn-sm">會員中心</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider>
      <AdminShell adminName={user.name}>{children}</AdminShell>
    </StoreProvider>
  );
}
