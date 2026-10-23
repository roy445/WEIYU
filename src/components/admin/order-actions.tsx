"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store-provider";
import { Dialog, apiRequest } from "./dialog";

type Action = "confirm" | "complete" | "cancel" | "mark_paid" | "mark_unpaid" | "mark_refunded" | "note" | "resend_email";

type Props = {
  orderId: number;
  status: string;
  paymentStatus: string;
  adminNote: string | null;
};

const confirmCopy: Partial<Record<Action, { title: string; body: string; button: string }>> = {
  cancel: {
    title: "取消訂單",
    body: "取消後將恢復此訂單扣除的庫存（僅會恢復一次），且無法再改回進行中。確定要取消嗎？",
    button: "確定取消訂單",
  },
  complete: {
    title: "標記為已完成",
    body: "表示已完成面交取貨。若顧客已當面付款，請一併標記「已付款」。",
    button: "標記完成",
  },
  mark_refunded: {
    title: "登記退款",
    body: "僅在已實際退還款項給顧客後再登記。",
    button: "登記退款",
  },
};

export function OrderActions({ orderId, status, paymentStatus, adminNote }: Props) {
  const router = useRouter();
  const { toast } = useStore();
  const [pending, setPending] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [note, setNote] = useState(adminNote ?? "");

  const run = async (action: Action) => {
    setPending(action);
    const result = await apiRequest(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, ...(action === "note" ? { adminNote: note } : {}) }),
    });
    setPending(null);
    setConfirming(null);
    if (!result.ok) {
      toast(result.data.error ?? "操作失敗。", "error");
      return;
    }
    if (action === "resend_email") {
      toast(result.data.message ?? "通知 Email 已寄出。");
      router.refresh();
      return;
    }
    if (action !== "note" && result.data.emailSent === false) {
      toast(result.data.message ?? "訂單已更新，但通知 Email 寄送失敗。", "error");
      router.refresh();
      return;
    }
    toast(
      action === "note"
        ? "店家備註已儲存。"
        : action === "cancel"
          ? "訂單已取消，庫存已恢復。"
          : action === "mark_paid"
            ? "已標記為已付款。"
            : action === "confirm"
              ? "訂單已確認，等待面交。"
              : action === "complete"
                ? "訂單已標記完成。"
                : "訂單已更新。",
    );
    router.refresh();
  };

  const trigger = (action: Action) => {
    if (confirmCopy[action]) setConfirming(action);
    else void run(action);
  };

  const isActive = status === "pending_confirmation" || status === "confirmed";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-[0.18em] text-caramel-deep">訂單狀態操作</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" disabled={pending !== null} onClick={() => void run("resend_email")}>
            {pending === "resend_email" ? "寄送中…" : "手動重寄通知 Email"}
          </button>
          {status === "pending_confirmation" ? (
            <button type="button" className="btn btn-primary btn-sm" disabled={pending !== null} onClick={() => trigger("confirm")}>
              {pending === "confirm" ? "處理中…" : "確認訂單（待面交）"}
            </button>
          ) : null}
          {status === "confirmed" ? (
            <button type="button" className="btn btn-primary btn-sm" disabled={pending !== null} onClick={() => trigger("complete")}>
              標記已完成取貨
            </button>
          ) : null}
          {isActive ? (
            <button type="button" className="btn btn-sm border border-[#D9B8AE] text-[#8A4B3D] hover:bg-[#FBF1EE]" disabled={pending !== null} onClick={() => trigger("cancel")}>
              取消訂單
            </button>
          ) : null}
          {!isActive ? <p className="text-sm text-cocoa-soft">此訂單已結束，狀態不可再變更。</p> : null}
        </div>
      </div>

      <div>
        <p className="text-xs tracking-[0.18em] text-caramel-deep">付款狀態操作（面交收款後再更新）</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {paymentStatus !== "paid" && status !== "cancelled" ? (
            <button type="button" className="btn btn-dark btn-sm" disabled={pending !== null} onClick={() => trigger("mark_paid")}>
              {pending === "mark_paid" ? "處理中…" : "已收到款項，標記已付款"}
            </button>
          ) : null}
          {paymentStatus === "paid" ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" disabled={pending !== null} onClick={() => trigger("mark_unpaid")}>
                改回尚未付款
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={pending !== null} onClick={() => trigger("mark_refunded")}>
                登記退款
              </button>
            </>
          ) : null}
          {paymentStatus === "refunded" ? <p className="text-sm text-cocoa-soft">已登記退款。</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="admin-note" className="text-xs tracking-[0.18em] text-caramel-deep">店家備註（顧客可在取消訂單時看到）</label>
        <textarea id="admin-note" className="field mt-2 min-h-24" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
        <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={pending !== null} onClick={() => run("note")}>
          {pending === "note" ? "儲存中…" : "儲存備註"}
        </button>
      </div>

      <Dialog open={confirming !== null} title={confirming ? confirmCopy[confirming]?.title ?? "" : ""} onClose={() => setConfirming(null)}>
        <p className="text-sm leading-relaxed text-cocoa">{confirming ? confirmCopy[confirming]?.body : ""}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setConfirming(null)} className="btn btn-secondary btn-sm">返回</button>
          <button type="button" onClick={() => confirming && run(confirming)} className="btn btn-dark btn-sm" disabled={pending !== null}>
            {pending ? "處理中…" : confirming ? confirmCopy[confirming]?.button : ""}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
