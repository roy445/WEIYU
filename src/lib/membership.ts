export const membershipTiers = [
  { name: "新會員", minimumSpend: 0 },
  { name: "小甜心", minimumSpend: 3_000 },
  { name: "吃貨", minimumSpend: 8_000 },
  { name: "甜點達人", minimumSpend: 15_000 },
  { name: "甜點收藏家", minimumSpend: 30_000 },
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
