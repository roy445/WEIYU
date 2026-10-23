import Link from "next/link";
import type { ShopSettings } from "@/db/schema";
import { LogoMark } from "./logo";

export function SiteFooter({ settings }: { settings: ShopSettings }) {
  const hasContact = Boolean(settings.contactEmail || settings.contactPhone || settings.contactSocial);

  return (
    <footer className="mt-24 border-t border-mist/70 bg-cream-deep/70">
      <div className="container-wy py-14">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-4 text-caramel">
              <LogoMark className="h-16 w-[2.9rem]" strokeWidth={2} title="WEIYU 唯遇甜所 品牌標誌" />
              <div className="leading-none">
                <p className="font-serif text-2xl tracking-[0.36em] text-caramel-deep">{settings.brandNameEn}</p>
                <p className="mt-2 text-xs tracking-[0.4em] text-caramel-deep">{settings.shopName}</p>
              </div>
            </div>
            <p className="mt-5 font-serif text-lg text-cocoa">{settings.tagline}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-cocoa-soft">
              一個人小批量製作的手作甜點，只提供面交取貨，取貨時當面付款。每一次相遇，都想留下一點甜。
            </p>
          </div>

          <div>
            <p className="eyebrow">Browse</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/products" className="link-quiet">全部甜點</Link></li>
              <li><Link href="/desserts" className="link-quiet">甜點介紹</Link></li>
              <li><Link href="/products?category=ambient" className="link-quiet">常溫甜點</Link></li>
              <li><Link href="/products?category=chilled" className="link-quiet">冷藏甜點</Link></li>
              <li><Link href="/products?category=gift" className="link-quiet">禮盒</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Help</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/ordering" className="link-quiet">訂購須知</Link></li>
              <li><Link href="/pickup" className="link-quiet">面交取貨與付款</Link></li>
              <li><Link href="/faq" className="link-quiet">常見問題</Link></li>
              <li><Link href="/privacy" className="link-quiet">隱私權告知</Link></li>
              <li><Link href="/terms" className="link-quiet">服務條款</Link></li>
              <li><Link href="/account" className="link-quiet">會員中心</Link></li>
              <li><Link href="/account/favorites" className="link-quiet">我的收藏</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Contact</p>
            <div className="mt-4 space-y-2.5 text-sm text-cocoa-soft">
              <p>
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: settings.isAcceptingOrders ? "#7FA37F" : "#C9A28F" }}
                  aria-hidden="true"
                />
                {settings.isAcceptingOrders ? "目前開放接單（面交取貨）" : "目前暫停接受新訂單"}
              </p>
              {settings.contactEmail ? (
                <p>
                  Email：
                  <a className="link-quiet underline decoration-mist underline-offset-4" href={`mailto:${settings.contactEmail}`}>
                    {settings.contactEmail}
                  </a>
                </p>
              ) : null}
              {settings.contactPhone ? <p>電話：{settings.contactPhone}</p> : null}
              {settings.contactSocial ? (
                <p>
                  社群：
                  {/^https?:\/\//.test(settings.contactSocial) ? (
                    <a className="link-quiet underline decoration-mist underline-offset-4" href={settings.contactSocial} target="_blank" rel="noreferrer noopener">
                      {settings.contactSocial.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    settings.contactSocial
                  )}
                </p>
              ) : null}
              {!hasContact ? <p className="text-xs leading-relaxed">聯絡方式尚未設定。</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-mist/70 pt-6 text-xs text-cocoa-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.brandNameEn}｜{settings.shopName}
          </p>
          <p className="tracking-[0.16em]">面交取貨 · 取貨時付款 · 不提供宅配與線上付款</p>
        </div>
      </div>
    </footer>
  );
}
