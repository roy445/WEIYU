import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createEmailVerificationToken, deleteExpiredPendingRegistrations, EMAIL_VERIFICATION_TTL_MS } from "@/lib/auth";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";
import { assertEmailConfiguration, sendEmailVerificationEmail } from "@/lib/email";

const GENERIC_MESSAGE = "若此 Email 需要啟用，啟用信已寄出。請在 1 小時內完成；若收件匣沒有看到，請檢查垃圾郵件。";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = asString(body.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("請輸入有效的電子郵件地址。");
  if (
    !rateLimit(clientKey(request, "resend-activation"), 5, 15 * 60 * 1000)
    || !rateLimit(`${clientKey(request, "resend-activation-email")}:${email}`, 3, 60 * 60 * 1000)
  ) {
    return fail("重寄次數過多，請稍後再試。", 429);
  }

  try {
    await deleteExpiredPendingRegistrations();
    assertEmailConfiguration();
    const rows = await db
      .select({
        id: users.id,
        emailVerifiedAt: users.emailVerifiedAt,
        pendingVerificationExpiresAt: users.pendingVerificationExpiresAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];
    if (!user || user.emailVerifiedAt) return ok({ message: GENERIC_MESSAGE });

    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
    const expiresAt = user.pendingVerificationExpiresAt && user.pendingVerificationExpiresAt < tokenExpiresAt
      ? user.pendingVerificationExpiresAt
      : tokenExpiresAt;
    if (expiresAt <= now) return ok({ message: GENERIC_MESSAGE });
    const token = await createEmailVerificationToken(user.id, expiresAt);
    await sendEmailVerificationEmail(email, token);
    return ok({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Activation email resend failed", {
      message: error instanceof Error ? error.message : "unknown",
      code: error && typeof error === "object" && "code" in error ? error.code : undefined,
    });
    return fail("目前無法寄送啟用信，請稍後再試。", 503);
  }
}
