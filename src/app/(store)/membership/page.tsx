import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { formatMembershipSpend, membershipTiers } from "@/lib/membership";

export const metadata: Metadata = { title: "會員等級制度" };

export default function MembershipPage() {
  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Sweet membership</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">甜點會員等級</h1>
        <p className="mt-5 text-sm leading-[1.9] text-cocoa-soft">
          依完成訂單的累積實付金額升級，取消訂單不列入計算。目前所有會員皆適用相同的甜甜數回饋與折抵規則；其他等級專屬優惠尚未啟用，日後確認後會在此公告。徽章圖片待上傳後補上。
        </p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {membershipTiers.map((tier, index) => (
          <Reveal key={tier.name} className="surface rounded-xl p-5" delay={index * 60}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Level {index + 1}</p>
                <h2 className="mt-2 text-2xl">{tier.name}</h2>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-caramel/60 text-[0.65rem] text-cocoa-soft">徽章</span>
            </div>
            <p className="mt-4 text-sm">累積完成消費滿 {formatMembershipSpend(tier.minimumSpend)}</p>
            <p className="mt-2 text-xs leading-relaxed text-cocoa-soft">甜甜數照常累積：每滿 NT$50 回饋 1 點，每點折抵 NT$1。</p>
          </Reveal>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/account" className="btn btn-primary">查看我的等級</Link>
        <Link href="/terms" className="btn btn-secondary">服務條款與回饋規則</Link>
      </div>
    </div>
  );
}
