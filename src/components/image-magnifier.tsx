"use client";

import { useState, type PointerEvent, type SyntheticEvent } from "react";
import { SafeImage } from "./safe-image";

const LENS_SIZE = 176;
const ZOOM = 2.6;

export function ImageMagnifier({
  src,
  alt,
  sizes,
  className = "object-cover",
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const [imageSize, setImageSize] = useState<{ src: string; width: number; height: number } | null>(null);
  const [pointer, setPointer] = useState<{ left: number; top: number; backgroundSize: string; backgroundPosition: string } | null>(null);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const left = Math.min(Math.max(0, event.clientX - rect.left - LENS_SIZE / 2), Math.max(0, rect.width - LENS_SIZE));
    const top = Math.min(Math.max(0, event.clientY - rect.top - LENS_SIZE / 2), Math.max(0, rect.height - LENS_SIZE));
    const loadedSize = imageSize?.src === src ? imageSize : null;
    const coverScale = loadedSize ? Math.max(rect.width / loadedSize.width, rect.height / loadedSize.height) : 0;
    const renderedWidth = loadedSize ? loadedSize.width * coverScale : 0;
    const renderedHeight = loadedSize ? loadedSize.height * coverScale : 0;
    const sourceX = x * rect.width + Math.max(0, (renderedWidth - rect.width) / 2);
    const sourceY = y * rect.height + Math.max(0, (renderedHeight - rect.height) / 2);
    const lensPointerX = event.clientX - rect.left - left;
    const lensPointerY = event.clientY - rect.top - top;
    setPointer({
      left,
      top,
      backgroundSize: loadedSize ? `${renderedWidth * ZOOM}px ${renderedHeight * ZOOM}px` : "",
      backgroundPosition: loadedSize
        ? `${lensPointerX - sourceX * ZOOM}px ${lensPointerY - sourceY * ZOOM}px`
        : `${(x - 0.5) * -LENS_SIZE * ZOOM}px ${(y - 0.5) * -LENS_SIZE * ZOOM}px`,
    });
  };

  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    if (!src) return;
    setImageSize({
      src,
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    });
  };

  return (
    <div
      className="group/magnifier relative h-full w-full overflow-hidden"
      onPointerEnter={move}
      onPointerMove={move}
      onPointerLeave={() => setPointer(null)}
    >
      <SafeImage
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        onLoad={onImageLoad}
        className={className}
      />
      {pointer && imageSize?.src === src ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-20 hidden overflow-hidden border-2 border-white shadow-[0_8px_28px_rgba(47,35,27,0.35)] md:block"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: pointer.left,
            top: pointer.top,
            backgroundColor: "#fffdf8",
          }}
        >
          <span
            className="absolute inset-0"
            style={{
              backgroundImage: src ? `url("${src.replaceAll('"', "%22")}")` : "none",
              backgroundRepeat: "no-repeat",
              backgroundSize: pointer.backgroundSize,
              backgroundPosition: pointer.backgroundPosition,
            }}
          />
        </span>
      ) : null}
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-cocoa/65 px-2.5 py-1 text-[0.65rem] text-cream opacity-0 transition-opacity group-hover/magnifier:opacity-100 max-md:hidden">
        移動游標放大細節
      </span>
    </div>
  );
}
