import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { formatDate } from "@/lib/brand";
import { getAvailableSlots, getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "面交取貨與付款" };
export const dynamic = "force-dynamic";

export default async function PickupPage() {
  const [settings, slots] = await Promise.all([getShopSettings(), getAvailableSlots()]);
  const locations = Array.from(slots.reduce((map, slot) => {
    if (!map.has(slot.locationId)) map.set(slot.locationId, { name: slot.locationName, description: slot.locationDescription, dates: new Set<string>() });
    map.get(slot.locationId)?.dates.add(slot.pickupDate);
    return map;
  }, new Map<number, { name: string; description: string | null; dates: Set<string> }>()));

  return (
    <div className="container-wy py-14 md:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Pickup & payment</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">面交取貨與付款</h1>
        <div className="mt-5 space-y-2 text-sm leading-relaxed text-cocoa-soft">
          {(settings.pickupIntro || "目前只提供面交取貨，於約定的時段與地點交付商品，並在取貨時付款。").split(/\r?\n/).filter(Boolean).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
        </div>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="surface rounded-xl p-6"><p className="eyebrow">Pickup</p><h2 className="mt-2 text-2xl">面交取貨</h2><p className="mt-2 text-sm text-cocoa-soft">目前不提供宅配、外送或郵寄。</p></div>
        <div className="surface rounded-xl p-6"><p className="eyebrow">Payment</p><h2 className="mt-2 text-2xl">取貨時付款</h2><p className="mt-2 text-sm text-cocoa-soft">僅於面交時付款，不提供線上刷卡或第三方金流。</p></div>
      </div>
      <section className="mt-12">
        <h2 className="text-2xl">目前可預約安排</h2>
        {locations.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-mist px-5 py-6 text-sm text-cocoa-soft">目前尚未開放面交預約，請稍後再查看。</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {locations.map(([id, location]) => (
              <li key={id} className="surface rounded-xl p-5">
                <h3 className="text-xl">{location.name}</h3>
                {location.description ? <p className="mt-2 text-sm text-cocoa-soft">{location.description}</p> : null}
                <p className="mt-3 text-xs text-caramel-deep">可預約日期：{Array.from(location.dates).map(formatDate).join("、")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {settings.cautionText.trim() ? (
        <section className="mt-12">
          <h2 className="text-2xl">取貨注意事項</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-cocoa-soft">{settings.cautionText.split(/\r?\n/).filter(Boolean).map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ul>
        </section>
      ) : null}
      <Link href="/ordering" className="mt-10 inline-block text-sm text-caramel-deep underline underline-offset-4">← 回訂購須知</Link>
    </div>
  );
}
