import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gte, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminActionLogs,
  coupons,
  orderItems,
  orderPointUses,
  orders,
  pointLots,
  pickupLocations,
  pickupSlots,
  productVariants,
  products,
  shopSettings,
  userCoupons,
  users,
} from "@/db/schema";
import { todayInTaipei } from "./brand";
import {
  COOKIE_FLAVOR_SLUGS,
  getSixCookieMixForVariant,
  isValidCustomSixCookieMix,
  SIX_COOKIE_CUSTOM_VARIANT,
  SIX_COOKIE_PACK_SLUG,
} from "./cookie-packs";
import type { SessionUser } from "./auth";
import { addThreeMonths } from "./rewards";
import { notifyProductTrackersForChange } from "./product-tracking";

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
  userCouponId?: number | null;
  pointsToUse?: number;
};

export type PlaceOrderResult = {
  orderId: number;
  orderNo: string;
  total: number;
  alreadyExisted: boolean;
  stockChanges: { productId: number; oldStock: number; newStock: number }[];
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
  const userCouponId = input.userCouponId ?? null;
  const pointsToUse = input.pointsToUse ?? 0;
  if (userCouponId !== null && (!Number.isInteger(userCouponId) || userCouponId <= 0)) {
    throw new OrderError("優惠券選擇不正確，請重新整理頁面。");
  }
  if (!Number.isInteger(pointsToUse) || pointsToUse < 0 || pointsToUse > 1_000_000) {
    throw new OrderError("甜甜數折抵數量不正確。");
  }

  try {
    return await runPlaceOrder(userId, normalized, {
      contactName,
      contactPhone,
      contactEmail,
      note,
      requestId,
      pickupSlotId: input.pickupSlotId,
      userCouponId,
      pointsToUse,
    });
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
        return { orderId: existing[0].id, orderNo: existing[0].orderNo, total: existing[0].total, alreadyExisted: true, stockChanges: [] };
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
  userCouponId: number | null;
  pointsToUse: number;
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
          stockChanges: [],
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

    const allCookieProducts = await tx.select({ id: products.id, slug: products.slug })
      .from(products)
      .where(inArray(products.slug, Object.values(COOKIE_FLAVOR_SLUGS)));
    const cookieIds = new Set(allCookieProducts.map((product) => product.id));
    const preProductRows = await tx.select({ id: products.id, slug: products.slug })
      .from(products)
      .where(inArray(products.id, [...new Set(normalized.map((item) => item.productId))]));
    const includesCookieBag = preProductRows.some((product) => product.slug === SIX_COOKIE_PACK_SLUG);
    const productIds = [...new Set([
      ...normalized.map((item) => item.productId),
      ...(includesCookieBag ? [...cookieIds] : []),
    ])].sort((a, b) => a - b);
    const variantIds = normalized
      .map((item) => item.variantId)
      .filter((value): value is number => typeof value === "number");

    const productRows = await tx
      .select()
      .from(products)
      .where(inArray(products.id, productIds))
      .orderBy(products.id)
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
    const cookieProductBySlug = new Map(
      [...productMap.values()].map((product) => [product.slug, product]),
    );
    const stockRequirements = new Map<number, number>();

    for (const item of normalized) {
      const product = productMap.get(item.productId);
      if (!product) throw new OrderError("有商品已不存在，請重新整理購物袋。", 409);
      if (!product.isActive) throw new OrderError(`「${product.name}」目前暫停販售，請先移除。`, 409);
      if (product.launchAt && product.launchAt.getTime() > Date.now()) {
        throw new OrderError(`「${product.name}」預計 ${new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" }).format(product.launchAt)} 上架，目前尚未開放訂購。`, 409);
      }
      if (product.price <= 0) throw new OrderError(`「${product.name}」尚未設定售價，目前無法訂購。`, 409);

      let unitPrice = product.price;
      let variantName: string | null = null;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id || !variant.isActive) {
          throw new OrderError(`「${product.name}」的規格已更新，請重新選擇。`, 409);
        }
        if (product.slug !== SIX_COOKIE_PACK_SLUG && variant.stock < item.quantity) {
          throw new OrderError(`「${product.name}」的所選規格庫存不足（剩餘 ${variant.stock}）。`, 409);
        }
        unitPrice += variant.priceDelta;
        variantName = variant.name;
      }

      if (product.slug === SIX_COOKIE_PACK_SLUG) {
        if (!item.variantId) {
          throw new OrderError("請選擇六入曲奇的店家配或客製化口味。", 400);
        }
        const mix = getSixCookieMixForVariant(variantName, note ?? "");
        if (!mix) {
          if (variantName === SIX_COOKIE_CUSTOM_VARIANT && !isValidCustomSixCookieMix(note ?? "")) {
            throw new OrderError("六入曲奇客製化需在訂單備註填寫原味、巧克力、抹茶各幾顆；每種至少 1 顆且合計 6 顆。", 400);
          }
          throw new OrderError("請選擇六入曲奇的「店家配」或「客製化」口味。", 400);
        }
        for (const [flavor, slug] of Object.entries(COOKIE_FLAVOR_SLUGS) as [keyof typeof COOKIE_FLAVOR_SLUGS, string][]) {
          const flavorProduct = cookieProductBySlug.get(slug);
          if (!flavorProduct || !flavorProduct.isActive) {
            throw new OrderError("六入曲奇有口味暫停販售，請稍後再試。", 409);
          }
          stockRequirements.set(
            flavorProduct.id,
            (stockRequirements.get(flavorProduct.id) ?? 0) + mix[flavor] * item.quantity,
          );
        }
      }

      if (product.slug !== SIX_COOKIE_PACK_SLUG) {
        stockRequirements.set(product.id, (stockRequirements.get(product.id) ?? 0) + item.quantity);
      }

      if (product.slug !== SIX_COOKIE_PACK_SLUG && product.stock < item.quantity) {
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

    for (const [productId, required] of stockRequirements) {
      const flavorProduct = productMap.get(productId);
      if (!flavorProduct || flavorProduct.stock < required) {
        const name = flavorProduct?.name ?? "曲奇口味";
        throw new OrderError(`「${name}」庫存不足，目前剩餘 ${Math.max(0, flavorProduct?.stock ?? 0)} 顆。`, 409);
      }
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    if (subtotal <= 0) throw new OrderError("訂單金額不正確，請重新整理。");

    let couponDiscount = 0;
    let couponTitle: string | null = null;
    if (meta.userCouponId !== null) {
      const userCouponRows = await tx
        .select()
        .from(userCoupons)
        .where(and(
          eq(userCoupons.id, meta.userCouponId),
          eq(userCoupons.userId, userId),
          eq(userCoupons.status, "available"),
        ))
        .for("update")
        .limit(1);
      const userCoupon = userCouponRows[0];
      if (!userCoupon) throw new OrderError("此優惠券已使用或不屬於你的帳號。", 409);
      const couponRows = await tx.select().from(coupons).where(eq(coupons.id, userCoupon.couponId)).for("update").limit(1);
      const coupon = couponRows[0];
      const now = new Date();
      const userCouponExpiresAt = userCoupon.expiresAt ?? coupon?.expiresAt;
      if (!coupon || coupon.type === "points" || !userCouponExpiresAt || userCouponExpiresAt <= now) {
        throw new OrderError("此優惠券已過期或不能用於訂單折抵。", 409);
      }
      if (coupon.newMemberOnly) {
        const memberRows = await tx.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
        if (!memberRows[0] || memberRows[0].createdAt < coupon.createdAt) {
          throw new OrderError("這組優惠券僅提供活動開始後註冊的新會員。", 409);
        }
      }
      if (coupon.firstOrderOnly) {
        const completedOrders = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.userId, userId), ne(orders.status, "cancelled")))
          .limit(1);
        if (completedOrders.length) throw new OrderError("此優惠券限尚未建立過其他訂單的新會員使用。", 409);
      }
      if (subtotal < coupon.minimumSubtotal) throw new OrderError(`此優惠券需消費滿 NT$${coupon.minimumSubtotal} 才能使用。`, 409);
      couponDiscount = coupon.type === "percent"
        ? Math.min(Math.floor((subtotal * coupon.value) / 100), coupon.maxDiscount ?? 1_000_000)
        : Math.min(subtotal, coupon.value);
      couponTitle = coupon.title;
    }

    const maxPointsUsable = subtotal - couponDiscount;
    if (meta.pointsToUse > maxPointsUsable) {
      throw new OrderError(`目前最多可使用 ${maxPointsUsable} 點甜甜數，折抵不可高於優惠券折抵後的商品金額。`, 409);
    }
    const pointRows = meta.pointsToUse > 0
      ? await tx
        .select()
        .from(pointLots)
        .where(and(eq(pointLots.userId, userId), gt(pointLots.remaining, 0), gt(pointLots.expiresAt, new Date())))
        .orderBy(pointLots.expiresAt, pointLots.createdAt, pointLots.id)
        .for("update")
      : [];
    const availablePoints = pointRows.reduce((total, lot) => total + lot.remaining, 0);
    if (meta.pointsToUse > availablePoints) {
      throw new OrderError(`可用甜甜數不足，目前只有 ${availablePoints} 點。`, 409);
    }

    const stockChangeMap = new Map<number, { productId: number; oldStock: number; newStock: number }>();
    // 口味單品與六入袋共用三款單品庫存，將需求合併後按固定商品 ID 條件更新，避免超賣。
    for (const [productId, quantity] of [...stockRequirements].sort(([a], [b]) => a - b)) {
      const product = productMap.get(productId);
      if (!product) throw new OrderError("有曲奇口味已不存在，請重新整理購物袋。", 409);
      const updated = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, productId), gte(products.stock, quantity)))
        .returning({ id: products.id, stock: products.stock });
      if (updated.length === 0) {
        throw new OrderError(`「${product.name}」庫存不足，請調整數量。`, 409);
      }
      stockChangeMap.set(productId, {
        productId,
        oldStock: product.stock,
        newStock: updated[0].stock,
      });
    }
    for (const line of lines) {
      if (line.variantId && line.productSlug !== SIX_COOKIE_PACK_SLUG) {
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

    const total = subtotal - couponDiscount - meta.pointsToUse;
    const pointsEarned = Math.floor(total / 50);
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
        couponDiscount,
        couponTitle,
        pointsUsed: meta.pointsToUse,
        pointsEarned,
        total,
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

    if (meta.userCouponId !== null) {
      await tx.update(userCoupons)
        .set({ status: "used", usedAt: new Date(), usedOrderId: created.id })
        .where(eq(userCoupons.id, meta.userCouponId));
    }

    let pointsRemainingToUse = meta.pointsToUse;
    for (const lot of pointRows) {
      if (pointsRemainingToUse <= 0) break;
      const used = Math.min(lot.remaining, pointsRemainingToUse);
      await tx.update(pointLots).set({ remaining: sql`${pointLots.remaining} - ${used}` }).where(eq(pointLots.id, lot.id));
      await tx.insert(orderPointUses).values({ orderId: created.id, pointLotId: lot.id, amount: used });
      pointsRemainingToUse -= used;
    }

    return { orderId: created.id, orderNo: created.orderNo, total, alreadyExisted: false, stockChanges: [...stockChangeMap.values()] };
  });
}

type AdminAction = "confirm" | "complete" | "cancel" | "mark_paid" | "mark_unpaid" | "mark_refunded" | "note";

export async function applyAdminOrderAction(
  admin: SessionUser,
  orderId: number,
  action: AdminAction,
  payload?: { adminNote?: string },
): Promise<{ ok: true; status: string; paymentStatus: string; notificationWarning?: string }> {
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    const order = rows[0];
    if (!order) throw new OrderError("找不到這筆訂單。", 404);

    let status = order.status;
    let paymentStatus = order.paymentStatus;
    const now = new Date();
    const patch: Record<string, unknown> = { updatedAt: now };
    const stockChangeMap = new Map<number, { productId: number; oldStock: number; newStock: number }>();

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
        const earned = Math.floor(order.total / 50);
        patch.pointsEarned = earned;
        if (earned > 0) {
          await tx.insert(pointLots).values({
            userId: order.userId,
            amount: earned,
            remaining: earned,
            source: "order",
            sourceOrderId: order.id,
            createdAt: now,
            expiresAt: addThreeMonths(now),
          });
        }
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
          const restoreProductStock = new Map<number, number>();
          const restoreVariantStock = new Map<number, number>();
          const hasCookieBag = items.some((item) => item.productSlug === SIX_COOKIE_PACK_SLUG);
          const cookieProducts = hasCookieBag
            ? await tx.select({ id: products.id, slug: products.slug })
              .from(products)
              .where(inArray(products.slug, Object.values(COOKIE_FLAVOR_SLUGS)))
            : [];
          const cookieProductBySlug = new Map(cookieProducts.map((product) => [product.slug, product]));
          for (const item of items) {
            if (item.productSlug === SIX_COOKIE_PACK_SLUG) {
              const mix = getSixCookieMixForVariant(item.variantName, order.customerNote ?? "");
              if (!mix) {
                throw new OrderError("無法依訂單記錄還原六入曲奇口味庫存，已中止取消以避免庫存錯誤。", 409);
              }
              for (const [flavor, slug] of Object.entries(COOKIE_FLAVOR_SLUGS) as [keyof typeof COOKIE_FLAVOR_SLUGS, string][]) {
                const flavorProduct = cookieProductBySlug.get(slug);
                if (!flavorProduct) throw new OrderError("曲奇口味商品不存在，無法安全回補庫存。", 409);
                restoreProductStock.set(
                  flavorProduct.id,
                  (restoreProductStock.get(flavorProduct.id) ?? 0) + mix[flavor] * item.quantity,
                );
              }
              continue;
            }
            if (item.productId) {
              restoreProductStock.set(item.productId, (restoreProductStock.get(item.productId) ?? 0) + item.quantity);
            }
            if (item.variantId) {
              restoreVariantStock.set(item.variantId, (restoreVariantStock.get(item.variantId) ?? 0) + item.quantity);
            }
          }
          for (const [productId, quantity] of [...restoreProductStock].sort(([a], [b]) => a - b)) {
            const [before] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, productId)).limit(1);
            const [restored] = await tx.update(products)
              .set({ stock: sql`${products.stock} + ${quantity}`, updatedAt: now })
              .where(eq(products.id, productId))
              .returning({ stock: products.stock });
            if (before && restored) {
              stockChangeMap.set(productId, { productId, oldStock: before.stock, newStock: restored.stock });
            }
          }
          for (const [variantId, quantity] of [...restoreVariantStock].sort(([a], [b]) => a - b)) {
            await tx.update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${quantity}` })
              .where(eq(productVariants.id, variantId));
          }
          patch.stockRestored = true;
        }
        const uses = await tx
          .select()
          .from(orderPointUses)
          .where(and(eq(orderPointUses.orderId, order.id), sql`${orderPointUses.restoredAt} IS NULL`))
          .for("update");
        for (const use of uses) {
          await tx
            .update(pointLots)
            .set({ remaining: sql`${pointLots.remaining} + ${use.amount}` })
            .where(and(eq(pointLots.id, use.pointLotId), gt(pointLots.expiresAt, now)));
          await tx.update(orderPointUses).set({ restoredAt: now }).where(eq(orderPointUses.id, use.id));
        }
        const usedCoupons = await tx
          .select({ id: userCoupons.id, couponId: userCoupons.couponId })
          .from(userCoupons)
          .where(and(eq(userCoupons.usedOrderId, order.id), eq(userCoupons.status, "used")))
          .for("update");
        for (const usedCoupon of usedCoupons) {
          const userCouponRows = await tx.select({ expiresAt: userCoupons.expiresAt }).from(userCoupons).where(eq(userCoupons.id, usedCoupon.id)).limit(1);
          const couponRows = await tx.select({ expiresAt: coupons.expiresAt, isActive: coupons.isActive }).from(coupons).where(eq(coupons.id, usedCoupon.couponId)).limit(1);
          const coupon = couponRows[0];
          const effectiveExpiry = userCouponRows[0]?.expiresAt ?? coupon?.expiresAt;
          if (coupon?.isActive && effectiveExpiry && effectiveExpiry > now) {
            await tx.update(userCoupons)
              .set({ status: "available", usedAt: null, usedOrderId: null })
              .where(eq(userCoupons.id, usedCoupon.id));
          }
        }
        break;
      }
      case "mark_paid": {
        if (status === "cancelled") throw new OrderError("已取消的訂單不可標記為已付款。", 409);
        if (paymentStatus === "paid") throw new OrderError("這筆訂單已標記為已付款，請勿重複操作。", 409);
        if (paymentStatus === "refunded") throw new OrderError("已退款的訂單不可再次標記為已付款。", 409);
        paymentStatus = "paid";
        patch.paymentStatus = paymentStatus;
        patch.paidAt = now;
        break;
      }
      case "mark_unpaid": {
        if (paymentStatus === "unpaid") throw new OrderError("這筆訂單已是尚未付款，無需重複操作。", 409);
        if (paymentStatus === "refunded") throw new OrderError("已退款的訂單不可改回尚未付款。", 409);
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
    return { ok: true as const, status, paymentStatus, stockChanges: [...stockChangeMap.values()] };
  });
  const notifications = await Promise.all(result.stockChanges.map((change) =>
    notifyProductTrackersForChange(change.productId, change),
  ));
  const warning = notifications.find((notification) => notification.warning)?.warning ??
    (notifications.some((notification) => notification.emailFailed > 0) ? "庫存已恢復，但部分商品追蹤 Email 寄送失敗。" : undefined);
  return {
    ok: true,
    status: result.status,
    paymentStatus: result.paymentStatus,
    ...(warning ? { notificationWarning: warning } : {}),
  };
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
