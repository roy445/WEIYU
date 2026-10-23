export const BRAND = {
  nameZh: "唯遇甜所",
  nameEn: "WEIYU",
  tagline: "遇見一口甜。",
  description:
    "唯遇甜所，希望每一份甜點都能成為日常裡值得收藏的片刻。小批量製作，面交取貨，取貨時付款。",
} as const;

export const ORDER_STATUS = {
  pending_confirmation: "待店家確認",
  confirmed: "已確認／待面交",
  completed: "已完成",
  cancelled: "已取消",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

export const PAYMENT_STATUS = {
  unpaid: "尚未付款",
  paid: "已付款",
  refunded: "已退款",
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending_confirmation: "bg-oat text-cocoa",
  confirmed: "bg-caramel/15 text-caramel-deep",
  completed: "bg-[#E4EDE4] text-[#3F5B41]",
  cancelled: "bg-[#EFE4E1] text-[#8A4B3D]",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  unpaid: "bg-[#F3ECE1] text-[#8A6A43]",
  paid: "bg-[#E4EDE4] text-[#3F5B41]",
  refunded: "bg-[#EFE4E1] text-[#8A4B3D]",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS, value);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.prototype.hasOwnProperty.call(PAYMENT_STATUS, value);
}

export function formatPrice(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(`${value}`.length === 10 ? `${value}T00:00:00Z` : value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayInTaipei(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}
