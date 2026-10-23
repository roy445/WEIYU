import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import { Reveal } from "@/components/reveal";
import { listCategories, listProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "全部甜點",
  description: "瀏覽唯遇甜所目前開放訂購的手作甜點，依分類、關鍵字與價格篩選。",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; category?: string; sort?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 60) : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const sort = typeof params.sort === "string" ? params.sort : undefined;

  const [products, categories] = await Promise.all([listProducts({ q, category, sort }), listCategories()]);
  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <div className="container-wy py-12 md:py-16">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">All desserts</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">{activeCategory ? activeCategory.name : "全部甜點"}</h1>
        <p className="mt-4 text-sm leading-relaxed text-cocoa-soft">
          {activeCategory?.description ?? "所有品項皆為小批量製作，面交取貨、取貨時付款。缺貨與暫停販售會即時顯示。"}
        </p>
      </Reveal>

      <div className="mt-10">
        <Suspense fallback={<div className="skeleton h-11 w-full max-w-sm" />}>
          <ProductFilters categories={categories.map((item) => ({ slug: item.slug, name: item.name }))} />
        </Suspense>
      </div>

      <p className="mt-6 text-xs tracking-[0.12em] text-cocoa-soft" aria-live="polite">
        {q ? `「${q}」的搜尋結果：` : ""}共 {products.length} 項甜點
      </p>

      {products.length === 0 ? (
        <div className="surface mt-6 rounded-lg px-6 py-16 text-center">
          <p className="font-serif text-xl">找不到符合條件的甜點</p>
          <p className="mt-2 text-sm text-cocoa-soft">試試其他關鍵字，或切換分類看看。</p>
        </div>
      ) : (
        <div key={`${q ?? ""}|${category ?? ""}|${sort ?? ""}`} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <div key={product.id} className="animate-rise h-full" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
              <ProductCard product={product} index={index} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
