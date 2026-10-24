import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart-drawer";
import { PinnedAnnouncement } from "@/components/announcement-banner";
import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SplashScreen } from "@/components/splash";
import { StoreProvider } from "@/components/store-provider";
import { ThemeSync } from "@/components/theme-sync";
import { getCurrentUser } from "@/lib/auth";
import { getPointsBalance } from "@/lib/rewards";
import { getShopSettings } from "@/lib/settings";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [user, settings, pinnedRows] = await Promise.all([
    getCurrentUser(),
    getShopSettings(),
    db.select({ id: announcements.id, title: announcements.title, body: announcements.body })
      .from(announcements)
      .where(eq(announcements.displayMode, "pinned"))
      .orderBy(desc(announcements.publishedAt))
      .limit(1),
  ]);
  const points = user ? await getPointsBalance(user.id) : 0;

  return (
    <StoreProvider>
      <ThemeSync theme={user?.theme ?? "light"} />
      <SplashScreen logoUrl={settings.logoUrl} />
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user ? { name: user.name, role: user.role, avatarColor: user.avatarColor, avatarUrl: user.avatarUrl, points } : null} />
        {pinnedRows[0] ? <PinnedAnnouncement announcement={pinnedRows[0]} /> : null}
        <main className="flex-1">{children}</main>
        <SiteFooter settings={settings} />
      </div>
      <CartDrawer />
      <PageTransition logoUrl={settings.logoUrl} />
    </StoreProvider>
  );
}
