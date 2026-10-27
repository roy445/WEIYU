import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CouponCenter } from "@/components/coupon-center";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableCoupons } from "@/lib/rewards";

export const metadata: Metadata = { title: "我的優惠券" };
export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/coupons");

  const items = await getAvailableCoupons(user.id);

  return (
    <div className="container-wy py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Coupon collection</p>
          <h1 className="mt-3 text-4xl">我的優惠券</h1>
          <p className="mt-2 text-sm text-cocoa-soft">可使用優惠券會列在這裡；結帳時選取即可。甜甜數已移至獨立專區。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/account/points" className="btn btn-secondary btn-sm">查看甜甜數</Link>
          <Link href="/account" className="btn btn-secondary btn-sm">回會員中心</Link>
        </div>
      </div>
      <div className="mt-8">
        <CouponCenter items={items} />
      </div>
    </div>
  );
}
