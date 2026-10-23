"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type CategoryOption = { slug: string; name: string };

export function ProductFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentCategory = searchParams.get("category") ?? "all";
  const currentSort = searchParams.get("sort") ?? "newest";
  const [query, setQuery] = useState(currentQ);

  useEffect(() => {
    setQuery(currentQ);
  }, [currentQ]);

  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all" || value === "newest") params.delete(key);
      else params.set(key, value);
    }
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    if (query === currentQ) return;
    const timer = window.setTimeout(() => update({ q: query.trim() || null }), 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-5" data-pending={isPending ? "true" : "false"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:max-w-sm">
          <span className="sr-only">搜尋甜點</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋甜點名稱或關鍵字"
            className="field pl-10"
            autoComplete="off"
          />
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-soft"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </label>

        <label className="flex items-center gap-3 text-sm text-cocoa-soft">
          <span className="shrink-0">排序</span>
          <select
            value={currentSort}
            onChange={(event) => update({ sort: event.target.value })}
            className="field min-h-[2.5rem] w-auto py-1.5"
          >
            <option value="newest">最新上架</option>
            <option value="price_asc">價格由低到高</option>
            <option value="price_desc">價格由高到低</option>
            <option value="name">名稱</option>
          </select>
        </label>
      </div>

      <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="商品分類">
        {[{ slug: "all", name: "全部" }, ...categories].map((category) => {
          const active = currentCategory === category.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => update({ category: category.slug })}
              aria-pressed={active}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs tracking-[0.12em] transition-colors ${
                active
                  ? "border-caramel bg-caramel text-cream"
                  : "border-mist bg-transparent text-cocoa hover:border-caramel hover:text-caramel-deep"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
