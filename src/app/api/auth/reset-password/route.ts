import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { hashPassword, passwordProblem } from "@/lib/auth";
import { asString, fail, ok, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson(request);
  const token = asString(body.token, 200);
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  if (!token) return fail("重設連結無效，請重新申請。");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  if (password !== confirm) return fail("兩次輸入的密碼不一致。");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const userId = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ userId: passwordResetTokens.userId })
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.id, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
        .for("update")
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      await tx.update(users).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(users.id, row.userId));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));
      await tx.delete(sessions).where(eq(sessions.userId, row.userId));
      return row.userId;
    });
    if (!userId) return fail("重設連結已失效或過期，請重新申請。", 410);
    return ok({ message: "密碼已重設，請使用新密碼登入。" });
  } catch {
    return fail("更新密碼失敗，請稍後再試。", 500);
  }
}
