import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";

export async function getAdminMemberReport(search = "") {
  const conditions = [eq(users.role, "customer")];
  const query = search.trim().slice(0, 80);
  if (query) {
    const pattern = `%${query}%`;
    const searchCondition = or(ilike(users.name, pattern), ilike(users.email, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
      orderCount: count(orders.id).mapWith(Number),
      completedSpend: sql<number>`coalesce(sum(case when ${orders.status} = 'completed' then ${orders.total} else 0 end), 0)::int`.mapWith(Number),
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(and(...conditions))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));
  return members;
}
