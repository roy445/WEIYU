export const SIX_COOKIE_PACK_SLUG = "six-cookie-gift-bag";
export const SIX_COOKIE_SHOP_MIX_VARIANT = "店家配（原味、巧克力、抹茶各 2）";
export const SIX_COOKIE_CUSTOM_VARIANT = "客製化（請於訂單備註填口味數量）";

function readFlavorCount(note: string, flavor: string): number | null {
  const matches = [...note.matchAll(new RegExp(`${flavor}(?:曲奇)?\\s*(?:[:：=]|x|×)?\\s*(\\d+)\\s*(?:顆|片)?`, "gi"))];
  if (matches.length !== 1) return null;
  const count = Number(matches[0][1]);
  return Number.isInteger(count) ? count : null;
}

export function isValidCustomSixCookieMix(note: string): boolean {
  const original = readFlavorCount(note, "原味");
  const chocolate = readFlavorCount(note, "巧克力");
  const matcha = readFlavorCount(note, "抹茶");
  return original !== null && chocolate !== null && matcha !== null &&
    original >= 1 && chocolate >= 1 && matcha >= 1 && original + chocolate + matcha === 6;
}
