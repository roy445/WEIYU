import { createHash, randomUUID } from "node:crypto";
import { and, eq, gte, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { avatarUpdates, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, rateLimit } from "@/lib/api";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(avatarUpdates)
    .where(and(
      eq(avatarUpdates.userId, user.id),
      eq(avatarUpdates.status, "success"),
      gte(avatarUpdates.createdAt, weekAgo),
    ));
  const used = Number(rows[0]?.count ?? 0);
  return ok({ remaining: Math.max(0, 3 - used), limit: 3, windowDays: 7 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("請先登入。", 401);
  if (!rateLimit(`avatar-upload:${user.id}`, 12, 60 * 60 * 1000)) return fail("頭像更新次數過多，請稍後再試。", 429);

  const reservationRows = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update");
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const countRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(avatarUpdates)
      .where(and(
        eq(avatarUpdates.userId, user.id),
        gte(avatarUpdates.createdAt, weekAgo),
        or(
          eq(avatarUpdates.status, "success"),
          and(eq(avatarUpdates.status, "pending"), gt(avatarUpdates.createdAt, new Date(Date.now() - 10 * 60 * 1000))),
        ),
      ));
    if (Number(countRows[0]?.count ?? 0) >= 3) return [];
    return tx.insert(avatarUpdates).values({ userId: user.id, status: "pending" }).returning({ id: avatarUpdates.id });
  });
  const reservation = reservationRows[0];
  if (!reservation) return fail("每位會員最近 7 天最多可成功更換 3 次頭像，請稍後再試。", 429);

  const releaseReservation = async () => {
    await db.delete(avatarUpdates).where(eq(avatarUpdates.id, reservation.id));
  };

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    await releaseReservation();
    return fail("頭像圖片服務尚未設定，請聯繫店家。", 503);
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    await releaseReservation();
    return fail("無法讀取圖片，請重新選擇。");
  }
  if (!(file instanceof File)) {
    await releaseReservation();
    return fail("請選擇已裁切的頭像圖片。");
  }
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    await releaseReservation();
    return fail("圖片無法上傳，請重新選擇後再試。");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "weiyu/avatars";
  const publicId = `member-${user.id}-${randomUUID()}`;
  const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", apiKey);
  form.set("timestamp", timestamp);
  form.set("folder", folder);
  form.set("public_id", publicId);
  form.set("signature", signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    const data = (await response.json()) as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !data.secure_url) {
      console.error("Cloudinary avatar upload failed", data.error?.message ?? response.status);
      await releaseReservation();
      return fail("頭像上傳失敗，請稍後再試。", 502);
    }

    const url = new URL(data.secure_url);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".cloudinary.com")) {
      await releaseReservation();
      return fail("圖片服務回傳了不安全的網址。", 502);
    }
    await db.transaction(async (tx) => {
      await tx.update(users).set({ avatarUrl: url.toString(), updatedAt: new Date() }).where(eq(users.id, user.id));
      await tx.update(avatarUpdates).set({ status: "success" }).where(eq(avatarUpdates.id, reservation.id));
    });
    return ok({ avatarUrl: url.toString() });
  } catch (error) {
    await releaseReservation();
    console.error("Cloudinary avatar upload failed", error instanceof Error ? error.message : "unknown");
    return fail("頭像上傳失敗，請檢查網路後再試。", 502);
  }
}
