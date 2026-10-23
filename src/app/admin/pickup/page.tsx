import type { Metadata } from "next";
import { and, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, pickupLocations, pickupSlots } from "@/db/schema";
import { PickupManager } from "@/components/admin/pickup-manager";
import { todayInTaipei } from "@/lib/brand";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "面交與接單設定" };

export default async function AdminPickupPage() {
  const [settings, locations, slots, counts] = await Promise.all([
    getShopSettings(),
    db.select().from(pickupLocations).orderBy(pickupLocations.sortOrder, pickupLocations.id),
    db.select().from(pickupSlots).orderBy(pickupSlots.pickupDate, pickupSlots.startTime),
    db
      .select({ slotId: orders.pickupSlotId, used: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(isNotNull(orders.pickupSlotId), ne(orders.status, "cancelled")))
      .groupBy(orders.pickupSlotId),
  ]);
  const usedMap = new Map(counts.map((row) => [row.slotId, Number(row.used)]));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Pickup</p>
        <h1 className="mt-3 text-3xl">面交與接單設定</h1>
        <p className="mt-2 text-sm text-cocoa-soft">
          所有面交地點與時段都由這裡設定並寫入資料庫。尚未設定時，前台結帳頁會顯示「尚未開放面交預約」並停用送出。
        </p>
      </div>
      <PickupManager
        locations={locations}
        slots={slots.map((slot) => ({ ...slot, used: usedMap.get(slot.id) ?? 0 }))}
        acceptingOrders={settings.isAcceptingOrders}
        today={todayInTaipei()}
      />
    </div>
  );
}
