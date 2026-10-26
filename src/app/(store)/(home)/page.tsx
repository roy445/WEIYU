import Image from "next/image";
import Link from "next/link";
import { LogoMark, LogoStacked } from "@/components/logo";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { HeroDessertCarousel } from "@/components/hero-dessert-carousel";
import { listCategories, listProducts } from "@/lib/products";
import { getShopSettings } from "@/lib/settings";
import { hasActivePickupOptions } from "@/lib/orders";
import { AnnouncementMarquee } from "@/components/announcement-banner";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const steps = [
  { title: "挑選甜點", text: "瀏覽當期品項，把喜歡的甜點加入購物袋。" },
  { title: "登入並填寫資訊", text: "建立會員後填寫取貨人姓名與聯絡電話。" },
  { title: "選擇面交時段", text: "從我開放的地點、日期與時段中選擇。" },
  { title: "等我確認", text: "送出後我會確認庫存與安排，再與你聯繫。" },
  { title: "面交取貨、當面付款", text: "依約定時段取貨，取貨時付款即可。" },
];

const faqs = [
  { q: "可以宅配或外送嗎？", a: "目前只提供面交取貨，不提供宅配、郵寄或外送，也沒有運費設定。" },
  { q: "怎麼付款？", a: "取貨時當面付款。網站不提供線上刷卡或第三方金流，也不會要求你輸入任何卡號。" },
  {
    q: "送出訂單後就一定成立嗎？",
    a: "送出後訂單狀態為「待店家確認」；我確認庫存與面交安排後，會更新為「已確認／待面交」，你可以在會員中心查看進度。",
  },
  {
    q: "可以指定面交地點與時間嗎？",
    a: "面交地點與時段由我在後台開放，結帳時只能從目前開放的選項中選擇。若尚未開放，結帳頁會清楚提示。",
  },
  { q: "如何查看訂單進度？", a: "登入後前往會員中心的訂單列表，點開訂單即可查看狀態、商品明細與面交安排。" },
  { q: "可以更改或取消訂單嗎？", a: "請儘早透過頁尾聯絡方式提供訂單編號聯繫店家。能否調整須依商品製作及面交進度確認，請以店家回覆為準。" },
  { q: "商品成分、過敏原和保存方式在哪裡看？", a: "請查看各商品頁的成分、過敏原及保存資訊。如有嚴重過敏或資訊不完整，請在下單前先向店家確認。" },
  { q: "忘記密碼或沒收到通知 Email 怎麼辦？", a: "登入頁有「忘記密碼」功能，重設連結有效 30 分鐘。若信件未到，請檢查垃圾郵件；訂單進度仍可在會員中心查看，持續有問題請用頁尾聯絡方式洽詢。" },
];

export default async function HomePage() {
  const [featured, categories, settings, pickupReady, marqueeAnnouncements] = await Promise.all([
    listProducts({ sort: "newest" }),
    listCategories(),
    getShopSettings(),
    hasActivePickupOptions(),
    db.select({ id: announcements.id, title: announcements.title, body: announcements.body })
      .from(announcements)
      .where(eq(announcements.displayMode, "marquee"))
      .orderBy(desc(announcements.publishedAt))
      .limit(5),
  ]);
  const featuredItems = featured.slice(0, 6);
  const productsWithGallery = featured.filter((product) => product.galleryImages.length > 1);
  const carouselProducts = productsWithGallery.length > 0 ? productsWithGallery : featured;
  const heroSlides = carouselProducts.flatMap((product) =>
    product.isActive && (product.galleryImages[0] || product.imageUrl)
      ? [{ slug: product.slug, name: product.name, imageUrl: product.galleryImages[0] || product.imageUrl || "" }]
      : [],
  ).slice(0, 6);

  return (
    <>
      <AnnouncementMarquee announcements={marqueeAnnouncements} />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-wy grid items-center gap-12 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow animate-rise" style={{ animationDelay: "80ms" }}>
              WEIYU · 唯遇甜所
            </p>
            <h1
              className="mt-5 font-serif text-[2.6rem] leading-[1.15] tracking-[0.04em] text-cocoa animate-rise sm:text-6xl"
              style={{ animationDelay: "200ms" }}
            >
              遇見一口甜。
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-cocoa-soft animate-rise" style={{ animationDelay: "340ms" }}>
              為日常留一點甜，讓平凡的時刻也值得收藏。一個人小批量製作的手作甜點，只在約定的時段面交，取貨時再付款。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 animate-rise" style={{ animationDelay: "480ms" }}>
              <Link href="/products" className="btn btn-primary">
                探索甜點
              </Link>
              <Link
                href="/desserts"
                className="group inline-flex items-center gap-2 text-sm tracking-[0.12em] text-cocoa transition-colors hover:text-caramel-deep"
              >
                看看甜點介紹
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs tracking-[0.14em] text-cocoa-soft animate-fade-in" style={{ animationDelay: "700ms" }}>
              <span>面交取貨</span>
              <span>取貨時付款</span>
              <span>小批量手作</span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative mx-auto w-full max-w-md animate-scale-in sm:max-w-lg lg:max-w-none">
              {heroSlides.length ? (
                <HeroDessertCarousel slides={heroSlides} />
              ) : (
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-oat-soft">
                  <div className="absolute inset-0 bg-[url('/images/hero.jpg')] bg-cover bg-center" role="img" aria-label="唯遇甜所手作甜點示意圖片" />
                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-lg border border-cream/60 bg-cream/90 px-4 py-3 text-xs tracking-[0.1em] text-cocoa">
                    <span>甜點示意圖片 · 實際商品以面交時為準</span>
                    <span className="font-serif text-sm tracking-[0.3em] text-caramel-deep">WEIYU</span>
                  </div>
                </div>
              )}
              {/* 品牌印章 */}
              <div
                className="absolute -left-3 -top-6 flex h-28 w-28 items-center justify-center rounded-full border border-oat bg-cream shadow-[0_18px_40px_-28px_rgba(84,59,43,0.7)] animate-rise sm:-left-6 sm:h-36 sm:w-36"
                style={{ animationDelay: "650ms" }}
              >
                <LogoMark className="h-[4.6rem] w-[3.3rem] text-caramel sm:h-24 sm:w-[4.3rem]" strokeWidth={1.8} title="WEIYU 唯遇甜所 品牌印章" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 當期甜點 */}
      <section className="container-wy py-16 md:py-24" aria-labelledby="featured-heading">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Selected</p>
            <h2 id="featured-heading" className="mt-3 text-3xl sm:text-4xl">
              當期甜點
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-cocoa-soft">
              目前開放訂購的品項會即時更新，缺貨或暫停販售會直接顯示在卡片上。
            </p>
          </div>
          <Link href="/products" className="btn btn-secondary btn-sm self-start sm:self-auto">
            查看全部甜點
          </Link>
        </Reveal>

        {featuredItems.length === 0 ? (
          <Reveal className="surface mt-10 rounded-lg px-6 py-14 text-center">
            <p className="font-serif text-xl">目前尚未上架甜點</p>
            <p className="mt-2 text-sm text-cocoa-soft">上架後會即時出現在這裡。</p>
          </Reveal>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {featuredItems.map((product, index) => (
              <Reveal key={product.id} delay={index * 90} className="h-full">
                <ProductCard product={product} index={index} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* 分類入口 */}
      {categories.length > 0 ? (
        <section className="bg-oat-soft/60 py-16 md:py-20" aria-labelledby="categories-heading">
          <div className="container-wy">
            <Reveal>
              <p className="eyebrow">Categories</p>
              <h2 id="categories-heading" className="mt-3 text-3xl">
                依分類挑選
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {categories.map((category, index) => (
                <Reveal key={category.id} delay={index * 80}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="group flex h-full flex-col justify-between rounded-lg border border-mist/70 bg-cream px-6 py-7 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-caramel/50"
                  >
                    <div>
                      <p className="font-serif text-2xl text-cocoa">{category.name}</p>
                      <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">{category.description}</p>
                    </div>
                    <span className="mt-6 inline-flex items-center gap-2 text-xs tracking-[0.16em] text-caramel-deep">
                      前往瀏覽
                      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 甜點介紹 */}
      <section className="container-wy py-20 md:py-28" aria-labelledby="desserts-heading">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-oat-soft">
              <Image src="/images/story.jpg" alt="製作甜點的過程示意圖，在木質工作檯上攪拌麵糊" fill sizes="(max-width: 1024px) 90vw, 42vw" className="object-cover" />
            </div>
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow">Desserts</p>
              <h2 id="desserts-heading" className="mt-3 text-3xl leading-snug sm:text-4xl">
                每一款，
                <br />
                都想讓你慢慢吃完。
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-6 space-y-4 text-[0.95rem] leading-[1.9] text-cocoa-soft">
                <p>
                  唯遇甜所是一個人的甜點工作——從配方、製作到面交，都是我自己來。目前分成常溫甜點、冷藏甜點與禮盒三類，依照已確認的訂單小批量製作。
                </p>
                <p>
                  每一款的成分、過敏原、保存方式與賞味期限都寫在商品頁，還沒確認的會標示待補充。想先知道每款適合什麼時候吃、該怎麼保存，可以先看甜點介紹。
                </p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <Link href="/desserts" className="btn btn-secondary mt-8">
                閱讀甜點介紹
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 製作理念 */}
      <section className="border-y border-mist/60 bg-cream-deep/60 py-16 md:py-20" aria-labelledby="craft-heading">
        <div className="container-wy">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Craft</p>
            <h2 id="craft-heading" className="mt-3 text-3xl">
              製作理念與商品資訊
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { title: "小批量製作", text: "依照已確認的訂單安排製作，每一批都在我能照顧好的範圍內。" },
              { title: "資訊如實標示", text: "成分、過敏原、保存方式與賞味期限由我親自填寫，還沒確認的欄位會顯示待補充，不會用猜的。" },
              { title: "清楚的狀態", text: "每個品項的庫存、缺貨與暫停販售狀態都即時反映在網站上，不會讓你下了單才發現沒有。" },
            ].map((item, index) => (
              <Reveal key={item.title} delay={index * 100}>
                <div className="h-full border-l border-caramel/50 pl-5">
                  <p className="font-serif text-xl text-cocoa">{item.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 訂購流程 */}
      <section className="container-wy py-20 md:py-24" aria-labelledby="process-heading">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">How to order</p>
          <h2 id="process-heading" className="mt-3 text-3xl">
            訂購流程
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 90} as="li" className="relative">
              <span className="font-serif text-3xl text-caramel/70">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-base font-medium text-cocoa">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* 面交與付款 */}
      <section className="bg-cocoa py-16 text-cream md:py-20" aria-labelledby="pickup-heading">
        <div className="container-wy grid gap-10 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <p className="text-[0.68rem] tracking-[0.34em] text-oat">PICKUP & PAYMENT</p>
            <h2 id="pickup-heading" className="mt-3 text-3xl text-cream">
              面交取貨與付款須知
            </h2>
            <div className="mt-6 space-y-3 text-sm leading-relaxed text-oat">
              {(settings.pickupIntro || "唯遇甜所目前只提供面交取貨，於約定的時段與地點當面交付商品，並在取貨時付款。")
                .split("\n")
                .filter(Boolean)
                .map((line) => (
                  <p key={line}>{line}</p>
                ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-oat/20 p-5">
                <dt className="text-xs tracking-[0.2em] text-oat">取貨方式</dt>
                <dd className="mt-2 font-serif text-xl text-cream">面交取貨</dd>
              </div>
              <div className="rounded-lg border border-oat/20 p-5">
                <dt className="text-xs tracking-[0.2em] text-oat">付款方式</dt>
                <dd className="mt-2 font-serif text-xl text-cream">取貨時付款</dd>
              </div>
              <div className="rounded-lg border border-oat/20 p-5">
                <dt className="text-xs tracking-[0.2em] text-oat">面交預約</dt>
                <dd className="mt-2 text-sm text-cream">{pickupReady ? "目前已開放可預約的面交時段" : "目前尚未開放面交預約"}</dd>
              </div>
              <div className="rounded-lg border border-oat/20 p-5">
                <dt className="text-xs tracking-[0.2em] text-oat">接單狀態</dt>
                <dd className="mt-2 text-sm text-cream">{settings.isAcceptingOrders ? "開放接單中" : "暫停接受新訂單"}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-oat/80">不提供宅配、外送、郵寄或線上付款；網站不會要求輸入任何信用卡或銀行資訊。</p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-wy py-20 md:py-24" aria-labelledby="faq-heading">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-heading" className="mt-3 text-3xl">
              常見問題
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cocoa-soft">
              查看更多訂單、帳號、商品保存與通知說明：
              <Link href="/ordering" className="mx-1 underline decoration-mist underline-offset-4 hover:text-caramel-deep">
                訂購須知
              </Link>
              與
              <Link href="/faq" className="mx-1 underline decoration-mist underline-offset-4 hover:text-caramel-deep">
                完整常見問題
              </Link>
              。
            </p>
          </Reveal>
          <div className="divide-y divide-mist/70">
            {faqs.map((faq, index) => (
              <Reveal key={faq.q} delay={index * 70} as="details" className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base text-cocoa marker:content-none">
                  {faq.q}
                  <span aria-hidden="true" className="text-caramel transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">{faq.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 品牌識別收尾 */}
      <section className="container-wy pb-12 pt-6">
        <Reveal className="flex justify-center">
          <LogoStacked size="lg" />
        </Reveal>
      </section>
    </>
  );
}
