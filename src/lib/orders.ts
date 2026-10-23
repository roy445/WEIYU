import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminActionLogs,
  orderItems,
  orders,
  pickupLocations,
  pickupSlots,
  productVariants,
  products,
  shopSettings,
} from "@/db/schema";
import { todayInTaipei } from "./brand";
import type { SessionUser } from "./auth";

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrderError";
    this.status = status;
  }
}

export type PlaceOrderInput = {
  items: { productId: number; variantId?: number | null; quantity: number }[];
  pickupSlotId: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note?: string;
  clientRequestId?: string;
};

export type PlaceOrderResult = {
  orderId: number;
  orderNo: string;
  total: number;
  alreadyExisted: boolean;
};

function makeOrderNo(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}`.slice(2) +
    `${now.getMonth() + 1}`.padStart(2, "0") +
    `${now.getDate()}`.padStart(2, "0");
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `WY${stamp}${random}`;
}

export async function placeOrder(userId: number, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderError("購物袋是空的，請先加入甜點。");
  }
  if (input.items.length > 30) {
    throw new OrderError("單筆訂單最多 30 種商品。");
  }

  const normalized = input.items.map((item) => ({
    productId: Number(item.productId),
    variantId: item.variantId ? Number(item.variantId) : null,
    quantity: Number(item.quantity),
  }));

  for (const item of normalized) {
    if (!Number.isInteger(item.productId) || item.productId <= 0) {
      throw new OrderError("商品資料不正確，請重新整理頁面。");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new OrderError("商品數量必須介於 1 到 99 之間。");
    }
  }

  const contactName = input.contactName?.trim();
  const contactPhone = input.contactPhone?.trim();
  const contactEmail = input.contactEmail?.trim();
  if (!contactName || contactName.length > 40) throw new OrderError("請填寫正確的取貨人姓名。");
  if (!contactPhone || !/^[0-9+\-\s()]{6,20}$/.test(contactPhone)) {
    throw new OrderError("請填寫可聯繫的電話號碼。");
  }
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
    throw new OrderError("請填寫正確的電子郵件。");
  }
  if (!Number.isInteger(input.pickupSlotId) || input.pickupSlotId <= 0) {
    throw new OrderError("請選擇面交日期與時段。");
  }
  const note = input.note?.trim().slice(0, 500) || null;
  const requestId = input.clientRequestId?.trim().slice(0, 80) || null;

  try {
    return await runPlaceOrder(userId, normalized, { contactName, contactPhone, contactEmail, note, requestId, pickupSlotId: input.pickupSlotId });
  } catch (error) {
    // 同一個 clientRequestId 被同時送出兩次：第二筆會撞到唯一索引，改回傳已建立的訂單
    const code = (error as { code?: string })?.code;
    if (code === "23505" && requestId) {
      const existing = await db
        .select({ id: orders.id, orderNo: orders.orderNo, total: orders.total })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.clientRequestId, requestId)))
        .limit(1);
      if (existing[0]) {
        return { orderId: existing[0].id, orderNo: existing[0].orderNo, total: existing[0].total, alreadyExisted: true };
      }
    }
    throw error;
  }
}

type NormalizedItem = { productId: number; variantId: number | null; quantity: number };
type OrderMeta = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string | null;
  requestId: string | null;
  pickupSlotId: number;
};

async function runPlaceOrder(userId: number, normalized: NormalizedItem[], meta: OrderMeta): Promise<PlaceOrderResult> {
  const { contactName, contactPhone, contactEmail, note, requestId } = meta;
  const input = { pickupSlotId: meta.pickupSlotId };
  return db.transaction(async (tx) => {
    if (requestId) {
      const existing = await tx
        .select({ id: orders.id, orderNo: orders.orderNo, total: orders.total })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.clientRequestId, requestId)))
        .limit(1);
      if (existing[0]) {
        return {
          orderId: existing[0].id,
          orderNo: existing[0].orderNo,
          total: existing[0].total,
          alreadyExisted: true,
        };
      }
    }

    const settingsRows = await tx.select().from(shopSettings).where(eq(shopSettings.id, 1)).limit(1);
    if (settingsRows[0] && !settingsRows[0].isAcceptingOrders) {
      throw new OrderError("店家目前暫停接單，請稍後再回來看看。", 409);
    }

    const slotRows = await tx
      .select()
      .from(pickupSlots)
      .where(eq(pickupSlots.id, input.pickupSlotId))
      .for("update")
      .limit(1);
    const slot = slotRows[0];
    if (!slot || !slot.isActive) throw new OrderError("這個面交時段已無法預約，請重新選擇。", 409);
    if (slot.pickupDate < todayInTaipei()) throw new OrderError("面交日期已過，請重新選擇。", 409);

    const locationRows = await tx
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.id, slot.locationId))
      .limit(1);
    const location = locationRows[0];
    if (!location || !location.isActive) throw new OrderError("這個面交地點目前未開放。", 409);

    const usedRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.pickupSlotId, slot.id), ne(orders.status, "cancelled")));
    const used = Number(usedRows[0]?.count ?? 0);
    if (used >= slot.capacity) {
      throw new OrderError("這個時段已額滿，請選擇其他面交時段。", 409);
    }

    const productIds = [...new Set(normalized.map((item) => item.productId))];
    const variantIds = normalized
      .map((item) => item.variantId)
      .filter((value): value is number => typeof value === "number");

    const productRows = await tx
      .select()
      .from(products)
      .where(inArray(products.id, productIds))
      .for("update");
    const productMap = new Map(productRows.map((row) => [row.id, row]));

    const variantRows = variantIds.length
      ? await tx.select().from(productVariants).where(inArray(productVariants.id, variantIds)).for("update")
      : [];
    const variantMap = new Map(variantRows.map((row) => [row.id, row]));

    const lines: {
      productId: number;
      variantId: number | null;
      productName: string;
      productSlug: string;
      variantName: string | null;
      imageUrl: string | null;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const item of normalized) {
      const product = productMap.get(item.productId);
      if (!product) throw new OrderError("有商品已不存在，請重新整理購物袋。", 409);
      if (!product.isActive) throw new OrderError(`「${product.name}」目前暫停販售，請先移除。`, 409);

      let unitPrice = product.price;
      let variantName: string | null = null;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id || !variant.isActive) {
          throw new OrderError(`「${product.name}」的規格已更新，請重新選擇。`, 409);
        }
        if (variant.stock < item.quantity) {
          throw new OrderError(`「${product.name}」的所選規格庫存不足（剩餘 ${variant.stock}）。`, 409);
        }
        unitPrice += variant.priceDelta;
        variantName = variant.name;
      }

      if (product.stock < item.quantity) {
        throw new OrderError(
          `「${product.name}」庫存不足，目前剩餘 ${Math.max(0, product.stock)} 份。`,
          409,
        );
      }

      lines.push({
        productId: product.id,
        variantId: item.variantId,
        productName: product.name,
        productSlug: product.slug,
        variantName,
        imageUrl: product.imageUrl,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      });
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    if (subtotal <= 0) throw new OrderError("訂單金額不正確，請重新整理。");

    // 扣庫存（條件式更新，避免負庫存與超賣）
    for (const line of lines) {
      const updated = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${line.quantity}`,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, line.productId), gte(products.stock, line.quantity)))
        .returning({ id: products.id });
      if (updated.length === 0) {
        throw new OrderError(`「${line.productName}」庫存不足，請調整數量。`, 409);
      }
      if (line.variantId) {
        const updatedVariant = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${line.quantity}` })
          .where(
            and(
              eq(productVariants.id, line.variantId),
              gte(productVariants.stock, line.quantity),
            ),
          )
          .returning({ id: productVariants.id });
        if (updatedVariant.length === 0) {
          throw new OrderError(`「${line.productName}」所選規格庫存不足，請調整數量。`, 409);
        }
      }
    }

    const orderNo = makeOrderNo();
    const inserted = await tx
      .insert(orders)
      .values({
        orderNo,
        userId,
        status: "pending_confirmation",
        paymentStatus: "unpaid",
        paymentMethod: "cash_on_pickup",
        subtotal,
        total: subtotal,
        contactName,
        contactEmail,
        contactPhone,
        pickupLocationId: location.id,
        pickupSlotId: slot.id,
        pickupLocationName: location.name,
        pickupLocationNotes: location.notes,
        pickupDate: slot.pickupDate,
        pickupTime: `${slot.startTime}–${slot.endTime}`,
        customerNote: note,
        clientRequestId: requestId,
      })
      .returning({ id: orders.id, orderNo: orders.orderNo });

    const created = inserted[0];
    if (!created) throw new OrderError("訂單建立失敗，請再試一次。", 500);

    await tx.insert(orderItems).values(
      lines.map((line) => ({
        orderId: created.id,
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        productSlug: line.productSlug,
        variantName: line.variantName,
        imageUrl: line.imageUrl,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    );

    return { orderId: created.id, orderNo: created.orderNo, total: subtotal, alreadyExisted: false };
  });
}

type AdminAction = "confirm" | "complete" | "cancel" | "mark_paid" | "mark_unpaid" | "mark_refunded" | "note";

export async function applyAdminOrderAction(
  admin: SessionUser,
  orderId: number,
  action: AdminAction,
  payload?: { adminNote?: string },
): Promise<{ ok: true; status: string; paymentStatus: string }> {
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    const order = rows[0];
    if (!order) throw new OrderError("找不到這筆訂單。", 404);

    let status = order.status;
    let paymentStatus = order.paymentStatus;
    const now = new Date();
    const patch: Record<string, unknown> = { updatedAt: now };

    if (typeof payload?.adminNote === "string") {
      patch.adminNote = payload.adminNote.trim().slice(0, 1000) || null;
    }

    switch (action) {
      case "confirm": {
        if (status !== "pending_confirmation") {
          throw new OrderError("只有「待店家確認」的訂單可以確認。", 409);
        }
        status = "confirmed";
        patch.status = status;
        patch.confirmedAt = now;
        break;
      }
      case "complete": {
        if (status !== "confirmed") {
          throw new OrderError("只有「已確認／待面交」的訂單可以標記完成。", 409);
        }
        status = "completed";
        patch.status = status;
        patch.completedAt = now;
        break;
      }
      case "cancel": {
        if (status !== "pending_confirmation" && status !== "confirmed") {
          throw new OrderError("這筆訂單目前的狀態無法取消。", 409);
        }
        status = "cancelled";
        patch.status = status;
        patch.cancelledAt = now;
        if (!order.stockRestored) {
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          for (const item of items) {
            if (item.productId) {
              await tx
                .update(products)
                .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: now })
                .where(eq(products.id, item.productId));
            }
            if (item.variantId) {
              await tx
                .update(productVariants)
                .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
                .where(eq(productVariants.id, item.variantId));
            }
          }
          patch.stockRestored = true;
        }
        break;
      }
      case "mark_paid": {
        if (status === "cancelled") throw new OrderError("已取消的訂單不可標記為已付款。", 409);
        paymentStatus = "paid";
        patch.paymentStatus = paymentStatus;
        patch.paidAt = now;
        break;
      }
      case "mark_unpaid": {
        paymentStatus = "unpaid";
        patch.paymentStatus = paymentStatus;
        patch.paidAt = null;
        break;
      }
      case "mark_refunded": {
        if (order.paymentStatus !== "paid") {
          throw new OrderError("只有已付款的訂單可以登記退款。", 409);
        }
        paymentStatus = "refunded";
        patch.paymentStatus = paymentStatus;
        break;
      }
      case "note": {
        break;
      }
      default:
        throw new OrderError("不支援的操作。", 400);
    }

    await tx.update(orders).set(patch).where(eq(orders.id, order.id));
    await tx.insert(adminActionLogs).values({
      adminId: admin.id,
      adminEmail: admin.email,
      action,
      targetType: "order",
      targetId: String(order.id),
      detail: `訂單 ${order.orderNo} → 狀態 ${status}／付款 ${paymentStatus}`,
    });
    return { ok: true as const, status, paymentStatus };
  });
  return result;
}

export async function logAdminAction(
  admin: SessionUser,
  action: string,
  targetType: string,
  targetId: string | number | null,
  detail?: string,
): Promise<void> {
  try {
    await db.insert(adminActionLogs).values({
      adminId: admin.id,
      adminEmail: admin.email,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      detail: detail?.slice(0, 1000) ?? null,
    });
  } catch {
    // 操作紀錄失敗不應阻斷主要流程
  }
}

export async function hasActivePickupOptions(): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: pickupSlots.id })
      .from(pickupSlots)
      .innerJoin(pickupLocations, eq(pickupSlots.locationId, pickupLocations.id))
      .where(
        and(
          eq(pickupSlots.isActive, true),
          eq(pickupLocations.isActive, true),
          gte(pickupSlots.pickupDate, todayInTaipei()),
          isNotNull(pickupSlots.id),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}
