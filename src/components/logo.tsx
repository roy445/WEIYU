/* eslint-disable @next/next/no-img-element */
/**
 * WEIYU 唯遇甜所 LOGO 系統
 * 依品牌 LOGO 以 SVG 重製：雙線橢圓印章、「遇」字、由走之底延伸的柔和曲線與枝葉。
 * 若管理員在「商店設定」填入完整 LOGO 圖片網址，開場動畫、頁面切換與登入頁會改用該圖片。
 */

type MarkProps = {
  className?: string;
  strokeWidth?: number;
  title?: string;
  showCharacter?: boolean;
};

export function LogoMark({ className = "h-14 w-10", strokeWidth = 1.8, title, showCharacter = true }: MarkProps) {
  return (
    <svg
      viewBox="0 0 100 140"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {/* 雙線橢圓印章 */}
      <ellipse cx="50" cy="70" rx="46" ry="64" stroke="currentColor" strokeWidth={strokeWidth} />
      <ellipse cx="50" cy="70" rx="41.5" ry="59.5" stroke="currentColor" strokeWidth={strokeWidth * 0.5} />
      {/* 「遇」字 */}
      {showCharacter ? (
        <text
          x="51"
          y="73"
          textAnchor="middle"
          fontSize="52"
          fontWeight="400"
          fill="currentColor"
          fontFamily='"Noto Serif TC", "Songti TC", "PMingLiU", serif'
          className="logo-glyph"
        >
          遇
        </text>
      ) : null}
      {/* 由走之底延伸的曲線 */}
      <path d="M26 88c-4 13 2 24 15 27 11 2.5 21-2 29-9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* 枝葉 */}
      <path d="M70 106c1-6.5 5.5-10 11-10-1 5.5-4.5 9-11 10Z" fill="currentColor" />
      <path d="M67 101c-5.5-2-9-6.5-9-12 5.5 1 9 5.5 9 12Z" fill="currentColor" fillOpacity="0.6" />
      <path d="M74 111c2.5-4.5 7-6.5 11.5-5.5-2.5 4.5-7 6.5-11.5 5.5Z" fill="currentColor" fillOpacity="0.8" />
    </svg>
  );
}

type Size = "sm" | "md" | "lg";

export function Wordmark({ size = "md", inverted = false, className = "" }: { size?: Size; inverted?: boolean; className?: string }) {
  const en =
    size === "sm" ? "text-[1.05rem] tracking-[0.32em]" : size === "md" ? "text-[1.4rem] tracking-[0.36em]" : "text-3xl tracking-[0.46em]";
  const zh =
    size === "sm" ? "mt-1 text-[0.6rem] tracking-[0.34em]" : size === "md" ? "mt-1.5 text-[0.72rem] tracking-[0.4em]" : "mt-3 text-sm tracking-[0.46em]";
  return (
    <span className={`flex flex-col leading-none ${className}`}>
      <span className={`font-serif ${en} ${inverted ? "text-cream" : "text-caramel-deep"}`}>WEIYU</span>
      <span className={`${zh} ${inverted ? "text-oat" : "text-caramel-deep"}`}>唯遇甜所</span>
    </span>
  );
}

/** 導覽列／頁尾使用的橫向 LOGO */
export function LogoHorizontal({ inverted = false, className = "", size = "md" }: { inverted?: boolean; className?: string; size?: "sm" | "md" }) {
  const markClass = size === "sm" ? "h-10 w-[1.8rem]" : "h-12 w-[2.2rem]";
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark className={`${markClass} ${inverted ? "text-oat" : "text-caramel"}`} strokeWidth={2.2} title="WEIYU 唯遇甜所 品牌標誌" />
      <Wordmark size={size} inverted={inverted} />
    </span>
  );
}

/** 完整直式 LOGO：開場、載入畫面、頁面切換與品牌區塊使用 */
export function LogoLockup({
  imageUrl,
  animated = false,
  size = "md",
  className = "",
}: {
  imageUrl?: string | null;
  animated?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="WEIYU 唯遇甜所"
        className={`${size === "lg" ? "h-72" : "h-56"} w-auto max-w-[82vw] object-contain ${animated ? "animate-breathe" : ""} ${className}`}
        decoding="async"
      />
    );
  }
  const large = size === "lg";
  return (
    <span className={`flex flex-col items-center text-center text-caramel-deep ${className}`}>
      <span className={`text-caramel ${animated ? "animate-breathe" : ""}`}>
        <LogoMark className={large ? "h-44 w-[7.8rem]" : "h-32 w-[5.7rem]"} strokeWidth={1.5} title="WEIYU 唯遇甜所 品牌標誌" />
      </span>
      <span className={`mt-7 font-serif ${large ? "pl-[0.5em] text-4xl tracking-[0.5em] sm:text-5xl" : "pl-[0.46em] text-3xl tracking-[0.46em]"}`}>WEIYU</span>
      <span className={`mt-3 ${large ? "pl-[0.5em] text-base tracking-[0.5em]" : "pl-[0.46em] text-sm tracking-[0.46em]"}`}>唯遇甜所</span>
      <span className={`mt-5 block h-px w-14 bg-caramel/70 ${animated ? "loader-line" : ""}`} aria-hidden="true" />
      <span className={`mt-4 pl-[0.36em] text-cocoa-soft ${large ? "text-sm tracking-[0.4em]" : "text-xs tracking-[0.36em]"}`}>遇見一口甜。</span>
    </span>
  );
}

export function LogoStacked({ className = "", size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return <LogoLockup size={size} className={className} />;
}
