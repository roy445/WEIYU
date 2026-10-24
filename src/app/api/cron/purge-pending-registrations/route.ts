import { fail, ok } from "@/lib/api";
import { deleteExpiredPendingRegistrations } from "@/lib/auth";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("排程清理尚未設定 CRON_SECRET。", 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return fail("未授權。", 401);

  const deleted = await deleteExpiredPendingRegistrations();
  return ok({ deleted });
}
