import type { Metadata } from "next";
import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, type ProductVariant } from "@/db/schema";
import { AddToBagButton } from "@/components/add-to-bag-button";
import { Reveal } from "@/components/reveal";
import { SafeImage } from "@/components/safe-image";
import { formatPrice } from "@/lib/brand";
import { listCategories, listProducts, type ProductListItem } from "@/lib/products";

export const metadata: Metadata = {
  title: "甜點介紹",
  description: "唯遇甜所每一款手作甜點的介紹、規格、成分、過敏原與保存方式，方便你在下單前慢慢看。",
};

export const dynamic = "force-dynamic";

function priceRange(price: number, variants: ProductVariant[]): string {
  const prices = [price, ...variants.map((variant) => price + variant.priceDelta)];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[0.68rem] tracking-[0.2em] text-caramel-deep">{label}</dt>
      <dd className={`mt-1 text-sm leading-relaxed ${value ? "text-cocoa" : "text-cocoa-soft"}`}>{value || "待補充"}</dd>
    </div>
  );
}

function DessertFeature({
  product,
  variants,
  categoryName,
  index,
}: {
  product: ProductListItem;
  variants: ProductVariant[];
  categoryName: string;
  index: number;
}) {
  const reverse = index % 2 === 1;
  const activeVariants = variants.filter((variant) => variant.isActive);
  const paragraphs = product.description
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("【示意圖片說明】"));
  const soldOut = product.stock <= 0;

  return (
    <Reveal as="article" id={product.slug} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-oat-soft ${reverse ? "lg:order-2" : ""}`}>
        <SafeImage src={product.imageUrl} alt={`${product.name} 甜點示意圖片`} sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover" />
        {soldOut ? <span className="badge absolute left-4 top-4 bg-cocoa/85 text-cream">缺貨中</span> : null}
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <p className="eyebrow">{categoryName}</p>
        <h3 className="mt-3 text-3xl leading-tight sm:text-4xl">{product.name}</h3>
        <p className="mt-3 font-serif text-2xl text-caramel-deep">{priceRange(product.price, activeVariants)}</p>
        {product.summary ? <p className="mt-4 text-base leading-relaxed text-cocoa">{product.summary}</p> : null}
        {paragraphs.length > 0 ? (
          <div className="mt-4 space-y-3 text-sm leading-[1.9] text-cocoa-soft">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {activeVariants.length > 0 ? (
          <div className="mt-6">
            <p className="text-[0.68rem] tracking-[0.2em] text-caramel-deep">規格</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {activeVariants.map((variant) => (
                <li key={variant.id} className="rounded-full border border-mist px-3.5 py-1.5 text-xs text-cocoa">
                  {variant.name} · {formatPrice(product.price + variant.priceDelta)}
                  {Math.min(product.stock, variant.stock) <= 0 ? "（缺貨）" : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-mist/60 pt-5 sm:grid-cols-2">
          <Info label="成分" value={product.ingredients} />
          <Info label="過敏原" value={product.allergens} />
          <Info label="保存方式" value={product.storageInfo} />
          <Info label="賞味期限" value={product.shelfLife} />
        </dl>
        {product.pickupNote ? <p className="mt-4 text-xs leading-relaxed text-cocoa-soft">取貨說明：{product.pickupNote}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3">
          {activeVariants.length > 0 ? (
            <Link href={`/products/${product.slug}`} className="btn btn-primary">
              選擇規格並加入購物袋
            </Link>
          ) : (
            <>
              <AddToBagButton
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  stock: product.stock,
                  isActive: product.isActive,
                  imageUrl: product.imageUrl,
                }}
              />
              <Link href={`/products/${product.slug}`} className="btn btn-secondary">
                查看商品頁
              </Link>
            </>
          )}
        </div>
      </div>
    </Reveal>
  );
}

export default async function DessertsPage() {
  const [categories, products] = await Promise.all([listCategories(), listProducts({ sort: "newest" })]);
  const ids = products.map((product) => product.id);
  const variants = ids.length
    ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids)).orderBy(asc(productVariants.sortOrder), asc(productVariants.id))
    : [];

  const groups = categories
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      items: products.filter((product) => product.categoryId === category.id),
    }))
    .filter((group) => group.items.length > 0);
  const others = products.filter((product) => !categories.some((category) => category.id === product.categoryId));
  if (others.length > 0) groups.push({ slug: "others", name: "其他甜點", description: null, items: others });

  let rowIndex = 0;

  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Desserts</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">甜點介紹</h1>
        <p className="mt-5 text-[0.95rem] leading-[1.9] text-cocoa-soft">
          唯遇甜所是一個人的小小甜點工作。這一頁整理了目前每一款甜點的介紹、規格、成分與保存方式，讓你在下單前可以慢慢看。照片為示意圖片，實際成品會依每次製作略有不同。
        </p>
      </Reveal>

      {groups.length > 0 ? (
        <Reveal className="mt-8 flex flex-wrap gap-2" delay={80}>
          {groups.map((group) => (
            <a
              key={group.slug}
              href={`#${group.slug}`}
              className="rounded-full border border-mist px-4 py-1.5 text-xs tracking-[0.12em] text-cocoa transition-colors hover:border-caramel hover:text-caramel-deep"
            >
              {group.name}（{group.items.length}）
            </a>
          ))}
        </Reveal>
      ) : null}

      {groups.length === 0 ? (
        <div className="surface mt-12 rounded-lg px-6 py-16 text-center">
          <p className="font-serif text-xl">目前還沒有上架的甜點</p>
          <p className="mt-2 text-sm text-cocoa-soft">上架後會自動出現在這裡。</p>
        </div>
      ) : (
        <div className="mt-16 space-y-24">
          {groups.map((group) => (
            <section key={group.slug} id={group.slug} aria-labelledby={`cat-${group.slug}`} className="scroll-mt-28">
              <Reveal className="border-b border-mist/60 pb-6">
                <p className="eyebrow">Category</p>
                <h2 id={`cat-${group.slug}`} className="mt-2 text-3xl">
                  {group.name}
                </h2>
                {group.description ? <p className="mt-2 text-sm text-cocoa-soft">{group.description}</p> : null}
              </Reveal>
              <div className="mt-12 space-y-20">
                {group.items.map((product) => (
                  <DessertFeature
                    key={product.id}
                    product={product}
                    variants={variants.filter((variant) => variant.productId === product.id)}
                    categoryName={group.name}
                    index={rowIndex++}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 保存與享用 */}
      <Reveal as="section" className="mt-24 rounded-[1.25rem] bg-cream-deep/70 px-6 py-10 sm:px-10" aria-labelledby="care-heading">
        <p className="eyebrow">Care</p>
        <h2 id="care-heading" className="mt-3 text-3xl">
          保存與享用的小提醒
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-serif text-xl text-cocoa">常溫甜點</p>
            <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">請放在陰涼處、避免陽光直射；各款的保存天數以商品頁的賞味期限為準。</p>
          </div>
          <div>
            <p className="font-serif text-xl text-cocoa">冷藏甜點</p>
            <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">面交時請自備保冷袋，取貨後盡快放進冰箱冷藏，並在標示天數內吃完。</p>
          </div>
          <div>
            <p className="font-serif text-xl text-cocoa">禮盒</p>
            <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">面交時可直接帶走；包裝上有任何需求，可以在訂單備註告訴我，我會盡量配合。</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-primary">
            前往選購
          </Link>
          <Link href="/ordering" className="btn btn-secondary">
            訂購須知
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
