"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

type ClearResult = {
  deletedCount?: number;
  restoredInventoryRecords?: number;
  restoredPoints?: number;
  removedEarnedPoints?: number;
  restoredCoupons?: number;
};

export function ClearAllOrders({ totalOrders }: { totalOrders: number }) {
  const router = useRouter();
  const { toast } = useStore();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const clear = async () => {
    const cleanReason = reason.trim();
    if (cleanReason.length < 2 || pending || totalOrders === 0) return;
    setPending(true);
    const result = await apiRequest<ClearResult>("/api/admin/orders/clear", {
      method: "POST",
      body: JSON.stringify({ reason: cleanReason }),
    });
    setPending(false);
    if (!result.ok) {
      toast(result.data.error ?? "清除失敗，資料未變更。", "error");
      return;
    }
    setReason("");
    toast(result.data.message ?? `已清除 ${result.data.deletedCount ?? 0} 筆訂單。`);
    router.refresh();
  };

  return (
    <section aria-labelledby="clear-all-orders-heading" className="rounded-lg border border-[#d8c5b8] bg-[#fbf6f0] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.16em] text-caramel-deep">測試資料清除</p>
          <h2 id="clear-all-orders-heading" className="mt-2 text-xl">刪除所有訂單紀錄</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cocoa-soft">
            目前全站共有 <strong className="text-cocoa">{totalOrders}</strong> 筆訂單；此操作不受下方篩選條件影響，會刪除所有狀態（包括已完成、已付款及已退款）。無法復原；會在同一交易中回補未取消訂單的庫存、仍有效的甜甜數折抵與優惠券，並移除這些訂單產生的回饋點數。此操作不會實際退款或呼叫外部金流；若曾手動回補庫存，請先核對避免重複增加。不會自動寄出訂單或補貨 Email；已寄出的信件無法撤回，相關郵件與管理稽核紀錄會保留。
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-xs text-cocoa-soft" htmlFor="clear-orders-reason">
          清除原因（必填）
          <textarea
            id="clear-orders-reason"
            className="field mt-2 min-h-20"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            minLength={2}
            required
            placeholder="例如：測試階段清除測試訂單，準備正式營運"
            disabled={pending || totalOrders === 0}
          />
        </label>
        <button
          type="button"
          className="btn btn-sm border border-[#c7a99a] bg-[#f7ece5] text-[#70483a] hover:bg-[#f1e1d8]"
          disabled={pending || totalOrders === 0 || reason.trim().length < 2}
          onClick={() => void clear()}
        >
          {pending ? "清除中…" : totalOrders === 0 ? "目前沒有訂單" : "填寫原因後刪除全部訂單"}
        </button>
      </div>
    </section>
  );
}
