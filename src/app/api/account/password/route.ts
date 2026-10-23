import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, hashPassword, passwordProblem, revokeOtherSessions, verifyPassword } from "@/lib/auth";
import { fail, ok, rateLimit, readJson } from "@/lib/api";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  if (!rateLimit(`password:${user.id}`, 6, 10 * 60 * 1000)) {
    return fail("嘗試次數過多，請 10 分鐘後再試。", 429);
  }

  const body = await readJson(request);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirm = typeof body.newPasswordConfirm === "string" ? body.newPasswordConfirm : "";

  if (!currentPassword) return fail("請輸入目前的密碼。");
  const problem = passwordProblem(newPassword);
  if (problem) return fail(problem);
  if (user.role === "admin" && newPassword.length < 10) return fail("管理員密碼至少需要 10 個字元。");
  if (newPassword !== confirm) return fail("兩次輸入的新密碼不一致。");
  if (newPassword === currentPassword) return fail("新密碼不可與目前密碼相同。");

  try {
    const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    const row = rows[0];
    if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
      return fail("目前的密碼不正確。", 401);
    }
    await db
      .update(users)
      .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await revokeOtherSessions(user.id);
    return ok({ message: "密碼已更新，其他裝置的登入狀態已一併登出。" });
  } catch {
    return fail("更新密碼失敗，請稍後再試。", 500);
  }
}
