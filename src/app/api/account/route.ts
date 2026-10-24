import { and, eq, gte, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { avatarUpdates, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { asString, fail, ok, readJson } from "@/lib/api";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);

  const body = await readJson(request);
  const name = asString(body.name, 40);
  const phone = asString(body.phone, 20);
  const theme = asString(body.theme, 10);
  const avatarColor = asString(body.avatarColor, 20);
  const rawAvatarUrl = body.avatarUrl;
  const avatarUrl = rawAvatarUrl === undefined ? undefined : rawAvatarUrl === null ? null : asString(rawAvatarUrl, 500) || null;

  if (name.length < 2) return fail("請填寫至少 2 個字的顯示名稱。");
  if (phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)) return fail("電話格式不正確。");
  if (theme !== "light" && theme !== "dark") return fail("請選擇有效的顯示主題。");
  if (!["caramel", "berry", "matcha", "blueberry"].includes(avatarColor)) return fail("請選擇有效的頭像樣式。");
  if (avatarUrl) {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".cloudinary.com")) return fail("頭像網址不正確。");
    } catch {
      return fail("頭像網址不正確。");
    }
  }

  try {
    const avatarAllowed = await db.transaction(async (tx) => {
      const currentRows = await tx
        .select({ avatarColor: users.avatarColor, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, user.id))
        .for("update")
        .limit(1);
      const current = currentRows[0];
      if (!current) return false;
      const avatarChanged = avatarColor !== current.avatarColor || (rawAvatarUrl !== undefined && avatarUrl !== current.avatarUrl);
      if (avatarChanged) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const countRows = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(avatarUpdates)
          .where(and(
            eq(avatarUpdates.userId, user.id),
            gte(avatarUpdates.createdAt, weekAgo),
            or(
              eq(avatarUpdates.status, "success"),
              and(eq(avatarUpdates.status, "pending"), gt(avatarUpdates.createdAt, new Date(now.getTime() - 10 * 60 * 1000))),
            ),
          ));
        if (Number(countRows[0]?.count ?? 0) >= 3) return false;
      }

      await tx
        .update(users)
        .set({ name, phone: phone || null, theme, avatarColor, avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      if (avatarChanged) await tx.insert(avatarUpdates).values({ userId: user.id, status: "success" });
      return true;
    });
    if (!avatarAllowed) return fail("每位會員最近 7 天最多可成功更換 3 次頭像，請稍後再試。", 429);
    return ok({ message: "會員資料已更新。" });
  } catch {
    return fail("更新會員資料失敗。", 500);
  }
}
