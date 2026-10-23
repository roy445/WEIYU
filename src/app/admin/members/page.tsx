import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { formatDate } from "@/lib/brand";

export const metadata: Metadata = { title: "會員帳號" };

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQuery } = await searchParams;
  const query = rawQuery?.trim().slice(0, 80) ?? "";
  const conditions = [eq(users.role, "customer")];
  if (query) {
    const pattern = `%${query}%`;
    const searchCondition = or(ilike(users.name, pattern), ilike(users.email, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      orderCount: count(orders.id).mapWith(Number),
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(and(...conditions))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Member accounts</p>
        <h1 className="mt-3 text-3xl">會員帳號</h1>
        <p className="mt-2 text-sm text-cocoa-soft">搜尋會員姓名或 Email，快速查看帳號基本資料與訂單數。</p>
      </header>

      <form method="get" className="surface flex flex-col gap-3 rounded-lg p-4 sm:flex-row">
        <input name="q" defaultValue={query} className="field" placeholder="搜尋姓名或 Email" aria-label="搜尋會員姓名或 Email" />
        <button type="submit" className="btn btn-primary btn-sm">搜尋</button>
        {query ? <Link href="/admin/members" className="btn btn-secondary btn-sm">清除</Link> : null}
      </form>

      <p className="text-xs text-cocoa-soft">
        {query ? `符合搜尋條件 ${members.length} 位` : `最近註冊的 ${members.length} 位會員（最多顯示 200 位）`}
      </p>

      {members.length === 0 ? (
        <p className="surface rounded-lg px-5 py-10 text-center text-sm text-cocoa-soft">沒有符合條件的會員。</p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.id} className="surface flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-cocoa">{member.name}</p>
                <p className="mt-1 text-sm text-cocoa-soft">{member.email}</p>
                <p className="mt-1 text-xs text-cocoa-soft">加入日期：{formatDate(member.createdAt)}</p>
              </div>
              <Link href={`/admin/orders?q=${encodeURIComponent(member.email)}`} className="btn btn-secondary btn-sm">
                查看 {member.orderCount} 筆訂單
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
