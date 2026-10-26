export const membershipTiers = [
  { name: "初遇", minimumSpend: 0, badgeImage: "/images/membership/tier-1-first-meeting.webp" },
  { name: "甜友", minimumSpend: 3_000, badgeImage: "/images/membership/tier-2-sweet-friend.webp" },
  { name: "熟客", minimumSpend: 8_000, badgeImage: "/images/membership/tier-3-regular-guest.webp" },
  { name: "知味", minimumSpend: 15_000, badgeImage: "/images/membership/tier-4-connoisseur.webp" },
  { name: "唯遇珍藏", minimumSpend: 30_000, badgeImage: "/images/membership/tier-5-weiyu-collector.webp" },
] as const;

export function getMembershipTier(completedSpend: number) {
  const spend = Math.max(0, completedSpend);
  let tierIndex = 0;
  for (let index = 1; index < membershipTiers.length; index += 1) {
    if (spend >= membershipTiers[index].minimumSpend) tierIndex = index;
    else break;
  }
  const current = membershipTiers[tierIndex];
  const next = membershipTiers[tierIndex + 1] ?? null;
  return {
    current,
    next,
    remainingSpend: next ? Math.max(0, next.minimumSpend - spend) : 0,
  };
}

export function formatMembershipSpend(amount: number): string {
  return `NT$${amount.toLocaleString("zh-TW")}`;
}
