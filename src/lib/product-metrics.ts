"use client";

export type ProductMetricEvent = "view" | "cart_add";

export function recordProductMetric(productId: number, event: ProductMetricEvent): void {
  void fetch(`/api/metrics/products/${productId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {
    // Analytics are best-effort and must not interrupt browsing or checkout.
  });
}
