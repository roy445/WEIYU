import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { fail, ok } from "@/lib/api";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return ok({ members: [] });
  try {
    const pattern = `%${query}%`;
    const search = or(ilike(users.name, pattern), ilike(users.email, pattern));
    const members = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.role, "customer"), search!))
      .limit(20);
    return ok({ members });
  } catch (error) {
    console.error("Admin member search failed", error instanceof Error ? error.message : "unknown");
    return fail("無法搜尋會員，請稍後再試。", 500);
  }
}
