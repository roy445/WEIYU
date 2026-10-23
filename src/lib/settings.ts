import "server-only";

import { and, eq, gte, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, pickupLocations, pickupSlots, shopSettings, type ShopSettings } from "@/db/schema";
import { todayInTaipei } from "./brand";

export const DEFAULT_SETTINGS: ShopSettings = {
  id: 1,
  shopName: "唯遇甜所",
  brandNameEn: "WEIYU",
  tagline: "遇見一口甜。",
  logoUrl: null,
  contactEmail: null,
  contactPhone: null,
  contactSocial: null,
  pickupIntro: "",
  orderingNotice: "",
  privacyNotice: "為處理會員註冊、訂單確認、面交聯繫及售後服務，本網站會使用您提供的會員與訂單聯絡資料；授權店務人員僅於帳號服務、訂單處理及客服所需範圍內使用。商品頁瀏覽與加入購物袋次數以彙總方式計算，不建立個別會員的瀏覽或購物袋紀錄。購物袋內容儲存在您目前使用的瀏覽器中。",
  termsText: "",
  faqText: "",
  cautionText: "",
  isAcceptingOrders: true,
  updatedAt: new Date(0),
};

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const rows = await db.select().from(shopSettings).where(eq(shopSettings.id, 1)).limit(1);
    return rows[0] ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export type AvailableSlot = {
  id: number;
  locationId: number;
  locationName: string;
  locationDescription: string | null;
  locationNotes: string | null;
  pickupDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  used: number;
  remaining: number;
};

export async function getAvailableSlots(): Promise<AvailableSlot[]> {
  try {
    const today = todayInTaipei();
    const rows = await db
      .select({
        id: pickupSlots.id,
        locationId: pickupSlots.locationId,
        locationName: pickupLocations.name,
        locationDescription: pickupLocations.description,
        locationNotes: pickupLocations.notes,
        pickupDate: pickupSlots.pickupDate,
        startTime: pickupSlots.startTime,
        endTime: pickupSlots.endTime,
        capacity: pickupSlots.capacity,
      })
      .from(pickupSlots)
      .innerJoin(pickupLocations, eq(pickupSlots.locationId, pickupLocations.id))
      .where(
        and(
          eq(pickupSlots.isActive, true),
          eq(pickupLocations.isActive, true),
          gte(pickupSlots.pickupDate, today),
        ),
      )
      .orderBy(pickupSlots.pickupDate, pickupSlots.startTime);

    if (rows.length === 0) return [];

    const counts = await db
      .select({
        slotId: orders.pickupSlotId,
        used: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(isNotNull(orders.pickupSlotId), ne(orders.status, "cancelled")))
      .groupBy(orders.pickupSlotId);

    const usedMap = new Map<number, number>();
    for (const row of counts) {
      if (row.slotId != null) usedMap.set(row.slotId, Number(row.used));
    }

    return rows.map((row) => {
      const used = usedMap.get(row.id) ?? 0;
      return { ...row, used, remaining: Math.max(0, row.capacity - used) };
    });
  } catch {
    return [];
  }
}
