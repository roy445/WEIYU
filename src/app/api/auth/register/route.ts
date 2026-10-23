import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, isValidEmail, passwordProblem } from "@/lib/auth";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "register"), 8, 10 * 60 * 1000)) {
    return fail("嘗試次數過多，請稍後再試。", 429);
  }

  const body = await readJson(request);
  const name = asString(body.name, 40);
  const email = asString(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  const termsAccepted = body.termsAccepted === true;
  const privacyAcknowledged = body.privacyAcknowledged === true;

  if (name.length < 2) return fail("請填寫至少 2 個字的顯示名稱。");
  if (!isValidEmail(email)) return fail("電子郵件格式不正確。");
  if (!termsAccepted || !privacyAcknowledged) return fail("請先閱讀並同意服務條款及隱私權告知。");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  if (password !== passwordConfirm) return fail("兩次輸入的密碼不一致。");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return fail("這個電子郵件已經註冊過，請直接登入。", 409);

  try {
    const inserted = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        role: "customer",
        termsAcceptedAt: new Date(),
        privacyAcknowledgedAt: new Date(),
      })
      .returning({ id: users.id, name: users.name, email: users.email });
    const user = inserted[0];
    if (!user) return fail("註冊失敗，請再試一次。", 500);
    await createSession(user.id);
    return ok({ user }, 201);
  } catch {
    return fail("註冊時發生問題，請稍後再試。", 500);
  }
}
