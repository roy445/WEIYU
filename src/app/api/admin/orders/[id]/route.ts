import { asString, fail, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { applyAdminOrderAction, OrderError } from "@/lib/orders";
import { sendOrderEmail } from "@/lib/email";

const ALLOWED = new Set(["confirm", "complete", "cancel", "mark_paid", "mark_unpaid", "mark_refunded", "note", "resend_email"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return fail("訂單編號不正確。");

  const body = await readJson(request);
  const action = asString(body.action, 30);
  if (!ALLOWED.has(action)) return fail("不支援的操作。");

  try {
    if (action === "resend_email") {
      await sendOrderEmail(id, "status");
      return ok({ message: "訂單通知 Email 已寄出。", emailSent: true });
    }
    const result = await applyAdminOrderAction(
      admin,
      id,
      action as "confirm" | "complete" | "cancel" | "mark_paid" | "mark_unpaid" | "mark_refunded" | "note",
      { adminNote: typeof body.adminNote === "string" ? body.adminNote : undefined },
    );
    if (action !== "note") {
      try {
        await sendOrderEmail(id, "status");
        return ok({ message: "訂單已更新，通知 Email 已寄出。", emailSent: true, ...result });
      } catch (emailError) {
        console.error("Order status email failed", emailError instanceof Error ? emailError.message : "unknown");
        return ok({ message: "訂單狀態已更新，但 Email 寄送失敗；可確認 SMTP 設定後手動重寄。", emailSent: false, ...result });
      }
    }
    return ok({ message: "訂單已更新。", ...result });
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, error.status);
    return fail("更新訂單失敗，請再試一次。", 500);
  }
}
