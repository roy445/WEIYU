const shareCopy = [
  (name: string) => `你看這個「${name}」看起來也太好吃了吧，要不要考慮買給我？`,
  (name: string) => `我剛發現「${name}」！光看就好想吃，你要不要陪我一起開吃？`,
  (name: string) => `把「${name}」分享給你，不覺得它很適合當作送我的小驚喜嗎？`,
  (name: string) => `今天突然好想吃「${name}」，要不要考慮買給我嚐嚐？`,
  (name: string) => `快看這款「${name}」，感覺會是幸福的一口。你願意請我嗎？`,
  (name: string) => `我先把「${name}」放進願望清單了，什麼時候一起吃？`,
  (name: string) => `這個「${name}」看起來很可以耶！要不要把甜點時間安排一下？`,
  (name: string) => `傳給你一個甜甜的暗示：「${name}」我想吃！`,
] as const;

export const PRODUCT_SHARE_COPY_COUNT = shareCopy.length;

export function getProductShareVariant(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % shareCopy.length;
}

export function getProductShareMessage(name: string, seed: string): string {
  const productName = name.trim() || "這款甜點";
  return shareCopy[getProductShareVariant(seed)](productName);
}

export function isProductShareSeed(value: string | undefined): value is string {
  return Boolean(value && value.length <= 64 && /^[a-z0-9-]+$/i.test(value));
}
