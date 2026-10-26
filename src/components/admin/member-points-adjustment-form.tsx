"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/store-provider";
import { apiRequest } from "./dialog";

export function MemberPointsAdjustmentForm({ userId, name, currentPoints }: { userId: number; name: string; currentPoints: number }) {
  const router = useRouter();
  const { toast } = useStore();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await apiRequest<{ message?: string }>(`/api/admin/members/${userId}/points`, {
      method: "POST",
      body: JSON.stringify({ delta: Number(delta), reason }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "甜甜數調整失敗，請稍後再試。");
      return;
    }
    toast(result.data.message ?? `${name} 的甜甜數已更新。`);
    setDelta("");
    setReason("");
    router.refresh();
  };

  return (
    <details className="rounded-lg border border-mist/70 p-3">
      <summary className="cursor-pointer text-sm font-medium text-caramel-deep">調整甜甜數（目前 {currentPoints.toLocaleString("zh-TW")} 點）</summary>
      <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-3 sm:min-w-72">
        <label className="block">
          <span className="field-label">調整點數（正數增加、負數扣除）</span>
          <input className="field" type="number" min="-1000000" max="1000000" step="1" value={delta} onChange={(event) => setDelta(event.target.value)} required />
        </label>
        <label className="block">
          <span className="field-label">調整原因（必填）</span>
          <textarea className="field min-h-20 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} minLength={2} maxLength={500} required />
        </label>
        <p className="text-xs leading-relaxed text-cocoa-soft">扣點不可超過目前可用餘額；新增點數依現行贈送規則於 3 個月後到期。每次調整都會留下管理紀錄。</p>
        {error ? <p role="alert" className="text-sm text-[#8A4B3D]">{error}</p> : null}
        <button type="submit" className="btn btn-primary btn-sm justify-self-start" disabled={pending}>
          {pending ? "儲存中…" : "確認調整"}
        </button>
      </form>
    </details>
  );
}
