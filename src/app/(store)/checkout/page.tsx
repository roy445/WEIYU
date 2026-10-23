import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableSlots, getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "結帳與面交預約" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="container-wy flex min-h-[60vh] items-center justify-center py-16">
        <div className="surface w-full max-w-md rounded-xl px-8 py-10 text-center animate-rise">
          <LogoMark className="mx-auto h-24 w-[4.3rem] text-caramel" strokeWidth={1.8} title="WEIYU 唯遇甜所 品牌標誌" />
          <h1 className="mt-5 text-3xl">請先登入</h1>
          <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">送出正式訂單需要會員身分，方便我與你聯繫面交。你的購物袋內容會保留。</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/login?next=/checkout" className="btn btn-primary">
              登入並繼續結帳
            </Link>
            <Link href="/register?next=/checkout" className="btn btn-secondary">
              建立會員
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [settings, slots] = await Promise.all([getShopSettings(), getAvailableSlots()]);

  return (
    <div className="container-wy py-12 md:py-16">
      <div className="max-w-2xl animate-rise">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">結帳與面交預約</h1>
        <p className="mt-4 text-sm leading-relaxed text-cocoa-soft">確認商品與取貨人資訊，選擇我開放的面交時段後送出訂單。我確認後會再與你聯繫。</p>
      </div>
      <div className="mt-10">
        <CheckoutForm user={{ name: user.name, email: user.email, phone: user.phone }} slots={slots} acceptingOrders={settings.isAcceptingOrders} />
      </div>
    </div>
  );
}
