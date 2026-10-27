import { asString, fail, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { clearAllOrders, OrderError } from "@/lib/orders";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const body = await readJson(request);
  const reason = asString(body.reason, 500);
  if (reason.length < 2) return fail("請填寫至少 2 個字的清除原因。", 400);

  try {
    const result = await clearAllOrders(admin, reason);
    const message = `已清除 ${result.deletedCount} 筆訂單；回補 ${result.restoredInventoryRecords} 項商品／規格庫存、${result.restoredPoints} 點未過期甜甜數及 ${result.restoredCoupons} 張仍可使用的優惠券，並移除 ${result.removedEarnedPoints} 點訂單消費回饋。`;
    return ok({ ...result, message });
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, error.status);
    console.error("Clear all orders failed", error instanceof Error ? error.message : "unknown");
    return fail("清除全部訂單失敗，交易已回滾，資料未變更。", 500);
  }
}
