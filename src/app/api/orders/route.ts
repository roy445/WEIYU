import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, readJson, asString, asInt, clientKey, rateLimit } from "@/lib/api";
import { OrderError, placeOrder } from "@/lib/orders";
import { sendOrderEmail } from "@/lib/email";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入才能查看訂單。", 401);
  try {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));
    return ok({ items: rows });
  } catch {
    return fail("無法讀取訂單，請稍後再試。", 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入，才能送出正式訂單。", 401);

  if (!rateLimit(`order:${user.id}:${clientKey(request, "orders")}`, 10, 5 * 60 * 1000)) {
    return fail("送出次數過多，請稍後再試。", 429);
  }

  const body = await readJson(request);
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map((raw) => {
    const record = raw as Record<string, unknown>;
    return {
      productId: asInt(record.productId),
      variantId: record.variantId == null ? null : asInt(record.variantId),
      quantity: asInt(record.quantity),
    };
  });

  try {
    const result = await placeOrder(user.id, {
      items,
      pickupSlotId: asInt(body.pickupSlotId),
      contactName: asString(body.contactName, 40),
      contactPhone: asString(body.contactPhone, 20),
      contactEmail: asString(body.contactEmail, 160),
      note: asString(body.note, 500),
      clientRequestId: asString(body.clientRequestId, 80),
    });
    let notificationSent: boolean | undefined;
    if (!result.alreadyExisted) {
      try {
        await sendOrderEmail(result.orderId, "created");
        notificationSent = true;
      } catch (emailError) {
        console.error("Order confirmation email failed", emailError instanceof Error ? emailError.message : "unknown");
        notificationSent = false;
      }
    }
    return ok({
      ...result,
      ...(notificationSent === undefined ? {} : { notificationSent }),
      ...(notificationSent === false ? { notificationWarning: "訂單已成立，但通知 Email 寄送失敗；請稍後聯繫店家確認。" } : {}),
    }, result.alreadyExisted ? 200 : 201);
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, error.status);
    console.error("placeOrder failed", error instanceof Error ? error.message : "unknown");
    return fail("訂單送出失敗，請稍後再試或聯繫店家。", 500);
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) return fail("訂單編號不正確。");
  try {
    const rows = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
      .limit(1);
    if (!rows[0]) return fail("找不到這筆訂單。", 404);
    return fail("會員無法自行取消訂單，請聯繫店家協助處理。", 403);
  } catch {
    return fail("操作失敗，請稍後再試。", 500);
  }
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "GET, POST, DELETE, HEAD, OPTIONS" } });
}
