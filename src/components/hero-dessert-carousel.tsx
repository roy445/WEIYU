"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SafeImage } from "@/components/safe-image";

export type HeroDessertSlide = { slug: string; name: string; imageUrl: string };

export function HeroDessertCarousel({ slides }: { slides: HeroDessertSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const active = slides[activeIndex];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveIndex((index) => (index + 1) % slides.length);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  if (!active) return null;

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-oat-soft">
      <Link href={`/products/${active.slug}`} className="absolute inset-0" aria-label={`查看${active.name}商品頁`}>
        <SafeImage
          key={active.imageUrl}
          src={active.imageUrl}
          alt={`${active.name}甜點照片`}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 1024px) 90vw, 46vw"
          className="object-cover"
        />
      </Link>
      <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-lg border border-cream/60 bg-cream/90 px-4 py-3 text-xs tracking-[0.1em] text-cocoa">
        <span>{active.name} · 手作甜點</span>
        <span className="font-serif text-sm tracking-[0.3em] text-caramel-deep">WEIYU</span>
      </div>
      {slides.length > 1 ? (
        <div className="absolute bottom-[5.25rem] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cocoa/65 px-3 py-2" aria-label="甜點圖片切換">
          {slides.map((slide, index) => (
            <button
              key={slide.slug}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`顯示${slide.name}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={`h-2.5 rounded-full transition-[width,background-color] duration-200 ${index === activeIndex ? "w-6 bg-cream" : "w-2.5 bg-cream/60 hover:bg-cream"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
