import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productLaunchReminders, products } from "@/db/schema";
import { asString, clientKey, fail, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(clientKey(request, "product-launch-reminder"), 5, 15 * 60 * 1000)) {
    return fail("登記次數過多，請稍後再試。", 429);
  }

  const { slug } = await context.params;
  const body = await readJson(request);
  const email = asString(body.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("請輸入有效的 Email 地址。");
  if (body.consent !== true) return fail("請先同意使用 Email 接收這款商品的上架提醒。");

  const rows = await db
    .select({ id: products.id, isActive: products.isActive, launchAt: products.launchAt })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  const product = rows[0];
  if (!product || !product.isActive) return fail("找不到這項即將上架的商品。", 404);
  if (!product.launchAt || product.launchAt.getTime() <= Date.now()) {
    return fail("這項商品目前沒有開放上架提醒。", 409);
  }

  await db
    .insert(productLaunchReminders)
    .values({ productId: product.id, email })
    .onConflictDoNothing();
  return ok({ message: "已登記上架提醒。商品上架時會寄送通知；若未收到，請查看垃圾郵件。" });
}
