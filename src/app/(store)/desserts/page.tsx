import type { Metadata } from "next";
import { FavoriteButton } from "@/components/favorite-button";
import { Reveal } from "@/components/reveal";
import { SafeImage } from "@/components/safe-image";
import { listCategories, listProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "甜點介紹",
  description: "認識唯遇甜所的手作甜點、風味故事、成分與保存方式。",
};

export const dynamic = "force-dynamic";

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
  categoryName,
  index,
}: {
  product: Awaited<ReturnType<typeof listProducts>>[number];
  categoryName: string;
  index: number;
}) {
  const reverse = index % 2 === 1;
  const paragraphs = product.description
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("【示意圖片說明】"));
  const ingredientNotes = [
    /奶油|butter/i.test(product.ingredients ?? "")
      ? "選用總統牌奶油，讓奶香乾淨、柔和地融入甜點，口感細緻而不厚重。"
      : null,
    /抹茶|matcha/i.test(`${product.name} ${product.ingredients ?? ""}`)
      ? "抹茶品項選用靜岡抹茶粉，呈現清雅茶香與恰到好處的回甘。"
      : null,
  ].filter((note): note is string => Boolean(note));

  return (
    <Reveal as="article" id={product.slug} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-oat-soft ${reverse ? "lg:order-2" : ""}`}>
        <SafeImage src={product.imageUrl} alt={`${product.name} 甜點示意圖片`} sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover" />
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <p className="eyebrow">{categoryName}</p>
        <h3 className="mt-3 text-3xl leading-tight sm:text-4xl">{product.name}</h3>
        {product.summary ? <p className="mt-4 text-base leading-relaxed text-cocoa">{product.summary}</p> : null}
        {paragraphs.length > 0 ? (
          <div className="mt-4 space-y-3 text-sm leading-[1.9] text-cocoa-soft">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        {ingredientNotes.length ? (
          <div className="mt-5 rounded-lg border border-caramel/20 bg-oat-soft/40 px-4 py-3 text-sm leading-relaxed text-cocoa">
            <p className="text-xs tracking-[0.16em] text-caramel-deep">嚴選原料</p>
            {ingredientNotes.map((note) => <p key={note} className="mt-1">{note}</p>)}
          </div>
        ) : null}

        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-mist/60 pt-5 sm:grid-cols-2">
          <Info label="成分" value={product.ingredients} />
          <Info label="過敏原" value={product.allergens} />
          <Info label="保存方式" value={product.storageInfo} />
          <Info label="賞味期限" value={product.shelfLife} />
        </dl>
        <div className="mt-7">
          <FavoriteButton productId={product.id} slug={product.slug} returnTo={`/desserts#${product.slug}`} />
        </div>
      </div>
    </Reveal>
  );
}

export default async function DessertsPage() {
  const [categories, products] = await Promise.all([listCategories(), listProducts({ sort: "newest" })]);

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
          唯遇甜所是一個人的小小甜點工作。我喜歡把日常的風味，慢慢做成值得細細品嚐的甜點。選材時也在意原料本身的香氣與質地：奶油品項使用總統牌奶油，抹茶品項選用靜岡抹茶粉，讓每一層風味都保有清楚而自然的個性。你可以在這裡認識每款甜點的靈感、口感與原料，也歡迎把喜歡的品項收藏起來。圖片為甜點示意，手作成品可能略有不同。
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
            <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">請放在陰涼處、避免陽光直射；各款的保存天數請依頁面標示為準。</p>
          </div>
          <div>
            <p className="font-serif text-xl text-cocoa">冷藏甜點</p>
            <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">請保持冷藏，食用前可依個人喜好稍微回溫，並在標示天數內享用。</p>
          </div>
          <div>
            <p className="font-serif text-xl text-cocoa">禮盒</p>
            <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">開封後請妥善密封並依內容物的保存方式放置，讓甜點維持合適的風味與口感。</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
