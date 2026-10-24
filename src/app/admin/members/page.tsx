import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { getAdminMemberReport } from "@/lib/admin-reports";
import { formatDateTime } from "@/lib/brand";
import { formatMembershipSpend, getMembershipTier } from "@/lib/membership";

export const metadata: Metadata = { title: "會員帳號" };

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQuery } = await searchParams;
  const query = rawQuery?.trim().slice(0, 80) ?? "";
  const [members, allMembers] = await Promise.all([
    getAdminMemberReport(query),
    query ? getAdminMemberReport() : Promise.resolve(null),
  ]);

  return (
    <div className="printable-report space-y-8">
      <header>
        <p className="eyebrow">Member accounts</p>
        <h1 className="mt-3 text-3xl">會員帳號</h1>
        <p className="mt-2 text-sm text-cocoa-soft">搜尋會員姓名或 Email，查看加入時間、累積完成消費、會員等級與訂單數。</p>
        <p className="mt-2 text-sm">會員總數：{(allMembers?.length ?? members.length).toLocaleString("zh-TW")}</p>
      </header>

      <form method="get" className="print-hidden surface flex flex-col gap-3 rounded-lg p-4 sm:flex-row">
        <input name="q" defaultValue={query} className="field" placeholder="搜尋姓名或 Email" aria-label="搜尋會員姓名或 Email" />
        <button type="submit" className="btn btn-primary btn-sm">搜尋</button>
        {query ? <Link href="/admin/members" className="btn btn-secondary btn-sm">清除</Link> : null}
      </form>

      <p className="text-xs text-cocoa-soft">
        {query ? `符合搜尋條件 ${members.length} 位` : `目前共有 ${members.length} 位會員`}
      </p>
      <div className="print-hidden flex flex-wrap gap-2">
        <a href={`/api/admin/reports/members${query ? `?q=${encodeURIComponent(query)}` : ""}`} className="btn btn-secondary btn-sm">下載會員 CSV</a>
        <PrintButton label="列印／另存為 PDF" />
      </div>

      {members.length === 0 ? (
        <p className="surface rounded-lg px-5 py-10 text-center text-sm text-cocoa-soft">沒有符合條件的會員。</p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.id} className="surface flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-cocoa">{member.name}</p>
                <p className="mt-1 text-sm text-cocoa-soft">{member.email}</p>
                {member.phone ? <p className="mt-1 text-xs text-cocoa-soft">電話：{member.phone}</p> : null}
                <p className="mt-1 text-xs text-cocoa-soft">加入時間：{formatDateTime(member.createdAt)}</p>
                <p className="mt-1 text-xs text-cocoa-soft">
                  完成消費 {formatMembershipSpend(member.completedSpend)} · 等級 {getMembershipTier(member.completedSpend).current.name} · 訂單 {member.orderCount} 筆
                </p>
              </div>
              <div className="print-hidden">
                <Link href={`/admin/orders?q=${encodeURIComponent(member.email)}`} className="btn btn-secondary btn-sm">
                  查看 {member.orderCount} 筆訂單
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
