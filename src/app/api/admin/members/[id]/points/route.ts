import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminActionLogs, pointLots, users } from "@/db/schema";
import { fail, ok, readJson, asString } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { addThreeMonths } from "@/lib/rewards";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  const userId = Number((await context.params).id);
  if (!Number.isSafeInteger(userId) || userId <= 0) return fail("使用者編號不正確。");
  const body = await readJson(request);
  const delta = typeof body.delta === "number" ? body.delta : Number(body.delta);
  const reason = asString(body.reason, 500).trim();
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
    return fail("請輸入介於 -1,000,000 至 1,000,000 的非零整數點數。", 400);
  }
  if (reason.length < 2) return fail("請填寫至少 2 個字的調整原因。", 400);

  try {
    const result = await db.transaction(async (tx) => {
      const target = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update").limit(1);
      if (!target[0]) return { error: "找不到此使用者。", status: 404 as const };

      const now = new Date();
      const lots = await tx
        .select({ id: pointLots.id, remaining: pointLots.remaining })
        .from(pointLots)
        .where(and(eq(pointLots.userId, userId), gt(pointLots.remaining, 0), gt(pointLots.expiresAt, now)))
        .orderBy(asc(pointLots.expiresAt), asc(pointLots.createdAt), asc(pointLots.id))
        .for("update");
      const balance = lots.reduce((total, lot) => total + lot.remaining, 0);
      if (delta < 0 && -delta > balance) {
        return { error: `可用甜甜數只有 ${balance} 點，不能扣除 ${-delta} 點。`, status: 409 as const };
      }

      if (delta > 0) {
        await tx.insert(pointLots).values({
          userId,
          amount: delta,
          remaining: delta,
          source: "gift",
          expiresAt: addThreeMonths(now),
        });
      } else {
        let pointsToRemove = -delta;
        for (const lot of lots) {
          const deduction = Math.min(lot.remaining, pointsToRemove);
          if (deduction > 0) {
            await tx.update(pointLots)
              .set({ remaining: sql`${pointLots.remaining} - ${deduction}` })
              .where(eq(pointLots.id, lot.id));
            pointsToRemove -= deduction;
          }
          if (pointsToRemove === 0) break;
        }
      }

      const updatedBalance = balance + delta;
      await tx.insert(adminActionLogs).values({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "points.adjust",
        targetType: "user",
        targetId: String(userId),
        detail: `甜甜數調整 ${delta > 0 ? "+" : ""}${delta} 點；調整後可用餘額 ${updatedBalance} 點。原因：${reason}`.slice(0, 1000),
      });
      return { balance: updatedBalance };
    });

    if (typeof result.error === "string") return fail(result.error, result.status ?? 400);
    return ok({ balance: result.balance, message: `${delta > 0 ? "增加" : "扣除"} ${Math.abs(delta)} 點完成；目前可用餘額 ${result.balance} 點。` });
  } catch (error) {
    console.error("Admin point adjustment failed", error instanceof Error ? error.message : "unknown");
    return fail("甜甜數調整失敗，資料未更新。", 500);
  }
}
