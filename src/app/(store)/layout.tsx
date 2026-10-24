import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart-drawer";
import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SplashScreen } from "@/components/splash";
import { StoreProvider } from "@/components/store-provider";
import { ThemeSync } from "@/components/theme-sync";
import { getCurrentUser } from "@/lib/auth";
import { getPointsBalance } from "@/lib/rewards";
import { getShopSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  const points = user ? await getPointsBalance(user.id) : 0;

  return (
    <StoreProvider>
      <ThemeSync theme={user?.theme ?? "light"} />
      <SplashScreen logoUrl={settings.logoUrl} />
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user ? { name: user.name, role: user.role, avatarColor: user.avatarColor, avatarUrl: user.avatarUrl, points } : null} />
        <main className="flex-1">{children}</main>
        <SiteFooter settings={settings} />
      </div>
      <CartDrawer />
      <PageTransition logoUrl={settings.logoUrl} />
    </StoreProvider>
  );
}
