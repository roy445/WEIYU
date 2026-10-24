import type { Metadata } from "next";
import { SharedCartPage } from "@/components/shared-cart-page";

export const metadata: Metadata = { title: "分享的購物袋" };

export default async function SharedCartRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedCartPage token={token} />;
}
