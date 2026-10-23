"use client";

import { useEffect } from "react";
import { recordProductMetric } from "@/lib/product-metrics";

export function ProductViewTracker({ productId }: { productId: number }) {
  useEffect(() => {
    recordProductMetric(productId, "view");
  }, [productId]);

  return null;
}
