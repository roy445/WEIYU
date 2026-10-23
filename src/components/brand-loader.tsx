import { LogoLockup } from "./logo";

/** 各頁面 loading.tsx 使用的品牌載入畫面：置中、明顯的 WEIYU LOGO */
export function BrandLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center px-6 py-16 text-center animate-fade-in-fast ${compact ? "min-h-[50vh]" : "min-h-[72vh]"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LogoLockup animated />
      <span className="sr-only">頁面載入中</span>
    </div>
  );
}
