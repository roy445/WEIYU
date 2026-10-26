import { and, count, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { coupons, userCoupons, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { asInt, asString, fail, ok, rateLimit, readJson } from "@/lib/api";
import { assertEmailConfiguration, sendManualEmail } from "@/lib/email";

export const maxDuration = 60;

const audiences = {
  verified_customers: "已驗證信箱的顧客會員",
  all_customers: "全部顧客會員（可能含未驗證信箱）",
  new50_holders: "持有可用 NEW50 優惠券的帳號（可能含未驗證信箱）",
} as const;

type Audience = keyof typeof audiences;
const MAX_RECIPIENTS = 100;

async function getRecipients(audience: Audience): Promise<{ email: string }[]> {
  if (audience === "verified_customers") {
    return db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, "customer"), isNotNull(users.emailVerifiedAt)))
      .orderBy(users.email);
  }

  if (audience === "all_customers") {
    return db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(users.email);
  }

  const now = new Date();
  return db
    .selectDistinct({ email: users.email })
    .from(userCoupons)
    .innerJoin(users, eq(userCoupons.userId, users.id))
    .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
    .where(and(
      eq(coupons.code, "NEW50"),
      eq(coupons.isActive, true),
      gt(coupons.expiresAt, now),
      eq(userCoupons.status, "available"),
      or(isNull(userCoupons.expiresAt), gt(userCoupons.expiresAt, now)),
    ))
    .orderBy(users.email);
}

async function getAudienceCounts() {
  const now = new Date();
  const [verified, all, new50] = await Promise.all([
    db.select({ value: count() }).from(users).where(and(eq(users.role, "customer"), isNotNull(users.emailVerifiedAt))),
    db.select({ value: count() }).from(users).where(eq(users.role, "customer")),
    db.select({ value: count(userCoupons.id) })
      .from(userCoupons)
      .innerJoin(users, eq(userCoupons.userId, users.id))
      .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
      .where(and(
        eq(coupons.code, "NEW50"),
        eq(coupons.isActive, true),
        gt(coupons.expiresAt, now),
        eq(userCoupons.status, "available"),
        or(isNull(userCoupons.expiresAt), gt(userCoupons.expiresAt, now)),
      )),
  ]);

  return {
    verified_customers: verified[0]?.value ?? 0,
    all_customers: all[0]?.value ?? 0,
    new50_holders: new50[0]?.value ?? 0,
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  try {
    return ok({ audiences: await getAudienceCounts(), maxRecipients: MAX_RECIPIENTS });
  } catch (error) {
    console.error("Email center audience lookup failed", error instanceof Error ? error.message : "unknown");
    return fail("無法載入收件名單，請稍後再試。", 500);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  if (!rateLimit(`admin-manual-email:${admin.id}`, 5, 60_000)) {
    return fail("寄送次數過於頻繁，請稍後再試。", 429);
  }

  const input = await readJson(request);
  const audienceValue = asString(input.audience, 40);
  const expectedRecipientCount = asInt(input.expectedRecipientCount, -1);
  const subject = asString(input.subject, 160).replace(/[\r\n]+/g, " ");
  const title = asString(input.title, 120);
  const body = asString(input.body, 5000);

  if (!Object.prototype.hasOwnProperty.call(audiences, audienceValue)) return fail("請選擇有效的收件對象。", 400);
  const audience = audienceValue as Audience;
  if (input.reviewed !== true) return fail("請先預覽郵件內容並確認收件對象。", 400);
  if (expectedRecipientCount < 0) return fail("收件人數無效，請重新載入並預覽郵件。", 400);
  if (subject.length < 2) return fail("Email 主旨至少需要 2 個字。", 400);
  if (title.length < 2) return fail("郵件標題至少需要 2 個字。", 400);
  if (body.length < 10) return fail("郵件內容至少需要 10 個字。", 400);
  if (body.includes("〔") || body.includes("〕")) return fail("請先替換範例內容中的提示文字再寄送。", 400);

  let recipients: { email: string }[];
  try {
    recipients = await getRecipients(audience);
  } catch (error) {
    console.error("Email center recipient lookup failed", error instanceof Error ? error.message : "unknown");
    return fail("無法取得收件名單，尚未寄出郵件。", 500);
  }

  if (recipients.length === 0) return fail("此收件範圍目前沒有符合條件的帳號，尚未寄出郵件。", 400);
  if (recipients.length !== expectedRecipientCount) {
    return fail("收件名單數量已變更，尚未寄出郵件；請重新載入並再次預覽。", 409, { recipientCount: recipients.length });
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return fail(`此收件範圍有 ${recipients.length} 位，單次最多寄送 ${MAX_RECIPIENTS} 位；請先縮小範圍。`, 400, { recipientCount: recipients.length });
  }

  try {
    assertEmailConfiguration();
  } catch {
    return fail("郵件服務尚未完成設定，未寄出任何郵件；請聯絡網站管理者檢查 SMTP 設定。", 503);
  }

  const reason = `後台手動寄送｜${audiences[audience]}｜${subject}`.slice(0, 500);
  let sent = 0;
  let failed = 0;

  for (let offset = 0; offset < recipients.length; offset += 3) {
    const batch = recipients.slice(offset, offset + 3);
    const outcomes = await Promise.all(batch.map(async ({ email }) => {
      try {
        await sendManualEmail(email, subject, title, body, reason);
        return true;
      } catch (error) {
        console.error("Manual email delivery failed", error instanceof Error ? error.message : "unknown");
        return false;
      }
    }));
    sent += outcomes.filter(Boolean).length;
    failed += outcomes.length - outcomes.filter(Boolean).length;
  }

  return ok({
    message: failed > 0 ? `寄送完成：${sent} 封成功、${failed} 封失敗。` : `已寄出 ${sent} 封郵件。`,
    recipientCount: recipients.length,
    sent,
    failed,
    audience: audiences[audience],
  });
}
