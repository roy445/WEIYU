import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteExpiredPendingRegistrations, setUnverifiedEmailReminder, verifyPassword } from "@/lib/auth";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = asString(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  const limiterKey = `${clientKey(request, "login")}:${email}`;
  if (!rateLimit(limiterKey, 8, 10 * 60 * 1000)) {
    return fail("登入嘗試次數過多，請 10 分鐘後再試。", 429);
  }

  if (!email || !password) return fail("請輸入電子郵件與密碼。");

  try {
    await deleteExpiredPendingRegistrations();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    // 避免帳號列舉：帳號不存在與密碼錯誤使用相同訊息
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail("電子郵件或密碼不正確。", 401);
    }
    if (!user.emailVerifiedAt) {
      await setUnverifiedEmailReminder(user.id);
      return fail("此帳號尚未啟用或需重新驗證 Email。請重寄啟用信後再登入。", 403);
    }
    await createSession(user.id);
    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch {
    return fail("登入時發生問題，請稍後再試。", 500);
  }
}
