import {
  ORDER_STATUS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS,
  PAYMENT_STATUS_TONE,
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/brand";

export function OrderStatusBadge({ status }: { status: string }) {
  const label = isOrderStatus(status) ? ORDER_STATUS[status] : status;
  const tone = isOrderStatus(status) ? ORDER_STATUS_TONE[status] : "bg-oat text-cocoa";
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const label = isPaymentStatus(status) ? PAYMENT_STATUS[status] : status;
  const tone = isPaymentStatus(status) ? PAYMENT_STATUS_TONE[status] : "bg-oat text-cocoa";
  return <span className={`badge ${tone}`}>{label}</span>;
}
