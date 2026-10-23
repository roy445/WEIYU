import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, pickupLocations, pickupSlots } from "@/db/schema";
import { optionalText, requireAdmin } from "@/lib/admin";
import { asBool, asInt, asString, fail, ok, readJson } from "@/lib/api";
import { logAdminAction } from "@/lib/orders";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  try {
    const locations = await db.select().from(pickupLocations).orderBy(pickupLocations.sortOrder, pickupLocations.id);
    const slots = await db.select().from(pickupSlots).orderBy(pickupSlots.pickupDate, pickupSlots.startTime);
    return ok({ locations, slots });
  } catch {
    return fail("無法讀取面交設定。", 500);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const body = await readJson(request);
  const type = asString(body.type, 20);

  if (type === "location") {
    const name = asString(body.name, 80);
    if (name.length < 2) return fail("請填寫面交地點名稱。");
    try {
      const inserted = await db
        .insert(pickupLocations)
        .values({
          name,
          description: optionalText(body.description, 500),
          notes: optionalText(body.notes, 500),
          isActive: asBool(body.isActive, true),
          sortOrder: asInt(body.sortOrder, 0) || 0,
        })
        .returning({ id: pickupLocations.id });
      await logAdminAction(admin, "pickup.location.create", "pickup_location", inserted[0]?.id ?? null, name);
      return ok({ id: inserted[0]?.id }, 201);
    } catch {
      return fail("新增面交地點失敗。", 500);
    }
  }

  if (type === "slot") {
    const locationId = asInt(body.locationId);
    const pickupDate = asString(body.pickupDate, 10);
    const startTime = asString(body.startTime, 5);
    const endTime = asString(body.endTime, 5);
    const capacity = asInt(body.capacity, 3);
    if (!Number.isInteger(locationId) || locationId <= 0) return fail("請選擇面交地點。");
    if (!DATE_PATTERN.test(pickupDate)) return fail("請選擇有效的面交日期。");
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || endTime <= startTime) {
      return fail("請填寫有效的時段（例如 14:00–16:00）。");
    }
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 99) return fail("可預約組數需介於 1 到 99。");
    try {
      const locationRows = await db.select().from(pickupLocations).where(eq(pickupLocations.id, locationId)).limit(1);
      if (!locationRows[0]) return fail("找不到這個面交地點。", 404);
      const inserted = await db
        .insert(pickupSlots)
        .values({ locationId, pickupDate, startTime, endTime, capacity, isActive: asBool(body.isActive, true) })
        .returning({ id: pickupSlots.id });
      await logAdminAction(admin, "pickup.slot.create", "pickup_slot", inserted[0]?.id ?? null, `${pickupDate} ${startTime}-${endTime}`);
      return ok({ id: inserted[0]?.id }, 201);
    } catch {
      return fail("新增面交時段失敗。", 500);
    }
  }

  return fail("不支援的設定類型。");
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const body = await readJson(request);
  const type = asString(body.type, 20);
  const id = asInt(body.id);
  if (!Number.isInteger(id) || id <= 0) return fail("設定編號不正確。");

  try {
    if (type === "location") {
      const patch: Record<string, unknown> = {};
      if ("name" in body) {
        const name = asString(body.name, 80);
        if (name.length < 2) return fail("請填寫面交地點名稱。");
        patch.name = name;
      }
      if ("description" in body) patch.description = optionalText(body.description, 500);
      if ("notes" in body) patch.notes = optionalText(body.notes, 500);
      if ("isActive" in body) patch.isActive = asBool(body.isActive, true);
      if ("sortOrder" in body) patch.sortOrder = asInt(body.sortOrder, 0) || 0;
      await db.update(pickupLocations).set(patch).where(eq(pickupLocations.id, id));
      await logAdminAction(admin, "pickup.location.update", "pickup_location", id, JSON.stringify(patch).slice(0, 400));
      return ok({ message: "面交地點已更新。" });
    }

    if (type === "slot") {
      const patch: Record<string, unknown> = {};
      if ("pickupDate" in body) {
        const pickupDate = asString(body.pickupDate, 10);
        if (!DATE_PATTERN.test(pickupDate)) return fail("請選擇有效的面交日期。");
        patch.pickupDate = pickupDate;
      }
      if ("startTime" in body) {
        const startTime = asString(body.startTime, 5);
        if (!TIME_PATTERN.test(startTime)) return fail("開始時間格式不正確。");
        patch.startTime = startTime;
      }
      if ("endTime" in body) {
        const endTime = asString(body.endTime, 5);
        if (!TIME_PATTERN.test(endTime)) return fail("結束時間格式不正確。");
        patch.endTime = endTime;
      }
      if ("capacity" in body) {
        const capacity = asInt(body.capacity, 3);
        if (!Number.isFinite(capacity) || capacity < 1 || capacity > 99) return fail("可預約組數需介於 1 到 99。");
        patch.capacity = capacity;
      }
      if ("isActive" in body) patch.isActive = asBool(body.isActive, true);
      await db.update(pickupSlots).set(patch).where(eq(pickupSlots.id, id));
      await logAdminAction(admin, "pickup.slot.update", "pickup_slot", id, JSON.stringify(patch).slice(0, 400));
      return ok({ message: "面交時段已更新。" });
    }
    return fail("不支援的設定類型。");
  } catch {
    return fail("更新面交設定失敗。", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const body = await readJson(request);
  const type = asString(body.type, 20);
  const id = asInt(body.id);
  if (!Number.isInteger(id) || id <= 0) return fail("設定編號不正確。");

  try {
    if (type === "location") {
      const slots = await db.select({ id: pickupSlots.id }).from(pickupSlots).where(eq(pickupSlots.locationId, id));
      const slotIds = slots.map((slot) => slot.id);
      const used = slotIds.length
        ? await db.select({ id: orders.id }).from(orders).where(inArray(orders.pickupSlotId, slotIds)).limit(1)
        : [];
      if (used[0]) {
        await db.update(pickupLocations).set({ isActive: false }).where(eq(pickupLocations.id, id));
        await db.update(pickupSlots).set({ isActive: false }).where(and(eq(pickupSlots.locationId, id)));
        await logAdminAction(admin, "pickup.location.archive", "pickup_location", id, "已有訂單使用，改為停用");
        return ok({ message: "這個地點已有訂單紀錄，已改為停用，不接受新預約。", archived: true });
      }
      await db.delete(pickupLocations).where(eq(pickupLocations.id, id));
      await logAdminAction(admin, "pickup.location.delete", "pickup_location", id);
      return ok({ message: "面交地點已刪除。", archived: false });
    }

    if (type === "slot") {
      const used = await db.select({ id: orders.id }).from(orders).where(eq(orders.pickupSlotId, id)).limit(1);
      if (used[0]) {
        await db.update(pickupSlots).set({ isActive: false }).where(eq(pickupSlots.id, id));
        await logAdminAction(admin, "pickup.slot.archive", "pickup_slot", id, "已有訂單使用，改為停用");
        return ok({ message: "這個時段已有訂單紀錄，已改為停用。", archived: true });
      }
      await db.delete(pickupSlots).where(eq(pickupSlots.id, id));
      await logAdminAction(admin, "pickup.slot.delete", "pickup_slot", id);
      return ok({ message: "面交時段已刪除。", archived: false });
    }

    return fail("不支援的設定類型。");
  } catch {
    return fail("刪除面交設定失敗。", 500);
  }
}
