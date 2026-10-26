import "server-only";

import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, pointLots, users } from "@/db/schema";

export async function getAdminMemberReport(search = "") {
  const query = search.trim().slice(0, 80);
  const pattern = `%${query}%`;
  const searchCondition = query ? or(ilike(users.name, pattern), ilike(users.email, pattern)) : undefined;

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      orderCount: count(orders.id).mapWith(Number),
      completedSpend: sql<number>`coalesce(sum(case when ${orders.status} = 'completed' then ${orders.total} else 0 end), 0)::int`.mapWith(Number),
      currentPoints: sql<number>`coalesce((select sum(${pointLots.remaining})::int from ${pointLots} where ${pointLots.userId} = ${users.id} and ${pointLots.remaining} > 0 and ${pointLots.expiresAt} > now()), 0)::int`.mapWith(Number),
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(searchCondition)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));
  return members;
}
