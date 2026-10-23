import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-6">
      <div className="text-center animate-rise">
        <LogoMark className="mx-auto h-16 w-12 text-caramel" strokeWidth={1.8} />
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-3 text-3xl">找不到這個頁面</h1>
        <p className="mt-3 text-sm text-cocoa-soft">可能是商品已下架，或網址輸入有誤。</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn btn-secondary btn-sm">回到首頁</Link>
          <Link href="/products" className="btn btn-primary btn-sm">探索甜點</Link>
        </div>
      </div>
    </div>
  );
}
