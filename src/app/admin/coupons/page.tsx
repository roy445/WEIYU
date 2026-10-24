import type { Metadata } from "next";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "優惠券管理" };

export default function AdminCouponsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Rewards</p>
        <h1 className="mt-3 text-3xl">優惠券管理</h1>
        <p className="mt-2 text-sm text-cocoa-soft">建立折價券、百分比券或甜甜數券，設定到期日、最低消費與可領取數量。</p>
      </header>
      <CouponManager />
    </div>
  );
}
