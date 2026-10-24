import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createEmailVerificationToken, deleteExpiredPendingRegistrations, EMAIL_VERIFICATION_TTL_MS, hashPassword, isValidEmail, passwordProblem } from "@/lib/auth";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";
import { assertEmailConfiguration, sendEmailVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "register"), 8, 10 * 60 * 1000)) {
    return fail("嘗試次數過多，請稍後再試。", 429);
  }

  const body = await readJson(request);
  const name = asString(body.name, 40);
  const email = asString(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  const requestedNext = asString(body.next, 500);
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : undefined;
  const termsAccepted = body.termsAccepted === true;
  const privacyAcknowledged = body.privacyAcknowledged === true;

  if (name.length < 2) return fail("請填寫至少 2 個字的顯示名稱。");
  if (!isValidEmail(email)) return fail("電子郵件格式不正確。");
  if (!termsAccepted || !privacyAcknowledged) return fail("請先閱讀並同意服務條款及隱私權告知。");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  if (password !== passwordConfirm) return fail("兩次輸入的密碼不一致。");

  try {
    await deleteExpiredPendingRegistrations();
    assertEmailConfiguration();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) return fail("這個電子郵件已經註冊過。若帳號尚未啟用，請至登入頁重寄啟用信。", 409);

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + EMAIL_VERIFICATION_TTL_MS);
    const inserted = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        role: "customer",
        pendingVerificationExpiresAt: expiresAt,
        termsAcceptedAt: createdAt,
        privacyAcknowledgedAt: createdAt,
        createdAt,
      })
      .returning({ id: users.id });
    const user = inserted[0];
    if (!user) throw new Error("New user insert returned no row.");

    try {
      const token = await createEmailVerificationToken(user.id, expiresAt);
      await sendEmailVerificationEmail(email, token, next);
    } catch (error) {
      await db.delete(users).where(eq(users.id, user.id));
      throw error;
    }

    return ok({
      message: "註冊資料已建立，請在 1 小時內開啟啟用信中的連結。啟用前無法登入；若收件匣沒有看到信，請檢查垃圾郵件。",
    }, 201);
  } catch (error) {
    console.error("Registration verification email failed", {
      message: error instanceof Error ? error.message : "unknown",
      code: error && typeof error === "object" && "code" in error ? error.code : undefined,
    });
    return fail("無法建立帳號或寄送啟用信，請確認 Email 後稍後重新註冊。", 503);
  }
}
