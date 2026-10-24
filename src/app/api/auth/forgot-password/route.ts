import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createPasswordResetToken } from "@/lib/auth";
import { assertEmailConfiguration, sendPasswordResetEmail } from "@/lib/email";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "forgot-password"), 5, 15 * 60 * 1000)) {
    return fail("請求次數過多，請稍後再試。", 429);
  }

  const body = await readJson(request);
  const email = asString(body.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("請輸入有效的電子郵件地址。");

  try {
    assertEmailConfiguration();
    const rows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (user) {
      const token = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user.email, token);
    }
    return ok({ message: "若此 Email 已註冊，重設密碼連結已寄送至該信箱，連結有效 30 分鐘。若收件匣沒有看到，請檢查垃圾郵件。" });
  } catch (error) {
    console.error("Password reset email failed", {
      message: error instanceof Error ? error.message : "unknown",
      code: error && typeof error === "object" && "code" in error ? error.code : undefined,
      syscall: error && typeof error === "object" && "syscall" in error ? error.syscall : undefined,
    });
    return fail("目前無法寄送重設密碼信件，請稍後再試或聯繫店家協助。", 503);
  }
}
