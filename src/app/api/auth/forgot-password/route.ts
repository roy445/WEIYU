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
    return ok({ message: "若此 Email 已註冊，重設密碼連結將寄送到該信箱，請於 30 分鐘內使用。" });
  } catch (error) {
    console.error("Password reset email failed", error instanceof Error ? error.message : "unknown");
    if (error instanceof Error && error.message.includes("SMTP 尚未設定完整")) {
      return fail("目前尚未完成郵件服務設定，請聯繫店家協助重設密碼。", 503);
    }
    return ok({ message: "若此 Email 已註冊且郵件服務正常，重設連結將寄送到該信箱，請於 30 分鐘內使用。" });
  }
}
