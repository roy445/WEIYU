"use client";

import Image from "next/image";
import { useState, type SyntheticEvent } from "react";
import { LogoMark } from "./logo";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

export function SafeImage({
  src,
  alt,
  className = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  fill = true,
  width,
  height,
  onLoad,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-oat-soft ${className}`}
        role="img"
        aria-label={`${alt}（目前沒有可顯示的圖片）`}
      >
        <LogoMark className="h-10 w-9 text-caramel/50" />
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        onLoad={onLoad}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 600}
      height={height ?? 450}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      onLoad={onLoad}
      className={className}
    />
  );
}
