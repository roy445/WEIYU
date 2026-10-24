import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gt } from "drizzle-orm";
import { CouponCenter } from "@/components/coupon-center";
import { db } from "@/db";
import { coupons, userCoupons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getPointsSummary } from "@/lib/rewards";

export const metadata: Metadata = { title: "甜甜數與優惠券" };
export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/coupons");

  const [items, points] = await Promise.all([
    db
      .select({
        id: userCoupons.id,
        couponId: coupons.id,
        code: coupons.code,
        title: coupons.title,
        type: coupons.type,
        value: coupons.value,
        minimumSubtotal: coupons.minimumSubtotal,
        expiresAt: coupons.expiresAt,
      })
      .from(userCoupons)
      .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
      .where(and(
        eq(userCoupons.userId, user.id),
        eq(userCoupons.status, "available"),
        gt(coupons.expiresAt, new Date()),
      ))
      .orderBy(asc(coupons.expiresAt)),
    getPointsSummary(user.id),
  ]);

  return (
    <div className="container-wy py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Sweet rewards</p>
          <h1 className="mt-3 text-4xl">甜甜數與優惠券</h1>
          <p className="mt-2 text-sm text-cocoa-soft">消費每滿 NT$50 獲得 1 點，未滿 50 元的部分無條件捨去；例如消費 NT$149 可得 2 點。每點折抵 NT$1。</p>
        </div>
        <Link href="/account" className="btn btn-secondary btn-sm">回會員中心</Link>
      </div>
      <div className="mt-8">
        <CouponCenter items={items} points={points} />
      </div>
    </div>
  );
}
