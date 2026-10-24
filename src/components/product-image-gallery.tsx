"use client";

import { useState } from "react";
import { ImageMagnifier } from "@/components/image-magnifier";
import { SafeImage } from "@/components/safe-image";

export function ProductImageGallery({
  images,
  alt,
  badge,
  badgeTone,
}: {
  images: string[];
  alt: string;
  badge: string | null;
  badgeTone: "caramel" | "cocoa";
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] ?? images[0] ?? null;

  return (
    <div className="space-y-3 animate-scale-in">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-oat-soft lg:aspect-[4/5]">
        <ImageMagnifier
          src={selectedImage}
          alt={`${alt} 商品圖片 ${selectedIndex + 1}`}
          priority
          sizes="(max-width: 1024px) 92vw, 50vw"
          className="object-cover"
        />
        {badge ? (
          <span className={`badge absolute left-4 top-4 ${badgeTone === "caramel" ? "bg-caramel" : "bg-cocoa/85"} text-cream`}>
            {badge}
          </span>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-3" aria-label={`${alt} 更多商品圖片`}>
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`查看 ${alt} 第 ${index + 1} 張圖片`}
              aria-pressed={selectedIndex === index}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 bg-oat-soft transition-colors ${
                selectedIndex === index ? "border-caramel" : "border-transparent hover:border-caramel/50"
              }`}
            >
              <SafeImage
                src={image}
                alt=""
                sizes="(max-width: 640px) 28vw, 15vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
