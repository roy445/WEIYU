export const SIX_COOKIE_PACK_SLUG = "six-cookie-gift-bag";
export const SIX_COOKIE_SHOP_MIX_VARIANT = "店家配（原味、巧克力、抹茶各 2）";
export const SIX_COOKIE_CUSTOM_VARIANT = "客製化（請於訂單備註填口味數量）";

export const COOKIE_FLAVOR_SLUGS = {
  original: "original-cookie",
  chocolate: "chocolate-cookie",
  matcha: "matcha-cookie",
} as const;

export type CookieFlavor = keyof typeof COOKIE_FLAVOR_SLUGS;
export type CookieMix = Record<CookieFlavor, number>;
export type CookieFlavorStocks = Record<CookieFlavor, number>;

export const SIX_COOKIE_SHOP_MIX: CookieMix = {
  original: 2,
  chocolate: 2,
  matcha: 2,
};

const FLAVOR_LABELS: Record<CookieFlavor, string> = {
  original: "原味",
  chocolate: "巧克力",
  matcha: "抹茶",
};

function readFlavorCount(note: string, flavor: string): number | null {
  const matches = [...note.matchAll(new RegExp(`${flavor}(?:曲奇)?\\s*(?:[:：=]|x|×)?\\s*(\\d+)\\s*(?:顆|片)?`, "gi"))];
  if (matches.length !== 1) return null;
  const count = Number(matches[0][1]);
  return Number.isSafeInteger(count) ? count : null;
}

export function parseCustomSixCookieMix(note: string): CookieMix | null {
  const mix: CookieMix = {
    original: readFlavorCount(note, FLAVOR_LABELS.original) ?? 0,
    chocolate: readFlavorCount(note, FLAVOR_LABELS.chocolate) ?? 0,
    matcha: readFlavorCount(note, FLAVOR_LABELS.matcha) ?? 0,
  };
  if (mix.original < 1 || mix.chocolate < 1 || mix.matcha < 1) return null;
  if (mix.original + mix.chocolate + mix.matcha !== 6) return null;
  return mix;
}

export function isValidCustomSixCookieMix(note: string): boolean {
  return parseCustomSixCookieMix(note) !== null;
}

export function getSixCookieMixForVariant(variantName: string | null, note: string): CookieMix | null {
  if (variantName === SIX_COOKIE_SHOP_MIX_VARIANT) return { ...SIX_COOKIE_SHOP_MIX };
  if (variantName === SIX_COOKIE_CUSTOM_VARIANT) return parseCustomSixCookieMix(note);
  return null;
}

export type SixCookieAvailability = {
  shopMix: number;
  custom: number;
  maxAvailable: number;
};

export function calculateSixCookieAvailability(stocks: CookieFlavorStocks): SixCookieAvailability {
  const original = Math.max(0, Math.trunc(stocks.original));
  const chocolate = Math.max(0, Math.trunc(stocks.chocolate));
  const matcha = Math.max(0, Math.trunc(stocks.matcha));
  const shopMix = Math.min(Math.floor(original / 2), Math.floor(chocolate / 2), Math.floor(matcha / 2));
  const upperBound = Math.min(Math.floor((original + chocolate + matcha) / 6), original, chocolate, matcha);
  let custom = 0;
  for (let bags = upperBound; bags > 0; bags -= 1) {
    const perBagCapacity = Math.floor(original / bags) + Math.floor(chocolate / bags) + Math.floor(matcha / bags);
    if (perBagCapacity >= 6) {
      custom = bags;
      break;
    }
  }
  return { shopMix, custom, maxAvailable: custom };
}

export function getSixCookieVariantAvailability(
  variantName: string,
  availability: SixCookieAvailability,
): number {
  if (variantName === SIX_COOKIE_SHOP_MIX_VARIANT) return availability.shopMix;
  if (variantName === SIX_COOKIE_CUSTOM_VARIANT) return availability.custom;
  return 0;
}
